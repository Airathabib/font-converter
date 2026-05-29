import { app, BrowserWindow } from 'electron';
import path from 'path';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import ttf2woff from 'ttf2woff';
import ttf2woff2 from 'ttf2woff2';

const appPath = app.getAppPath();
const fs = require('fs');
const hasProductionFiles = fs.existsSync(
  path.join(appPath, 'dist', 'index.html'),
);

const isDev =
  process.env.NODE_ENV === 'development' ||
  process.env.ELECTRON_IS_DEV === '1' ||
  !hasProductionFiles;

let mainWindow: BrowserWindow | null;
let server: any;

// ─────────────────────────────────────────────
// Валидация шрифта (встроена)
// ─────────────────────────────────────────────
function validateFontHeader(buffer: Buffer): {
  valid: boolean;
  error?: string;
} {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    return {
      valid: false,
      error: 'Некорректный файл: слишком маленький размер',
    };
  }
  const signature = buffer.readUInt32BE(0);
  const signatures: Record<number, { name: string; supported: boolean }> = {
    0x00010000: { name: 'TrueType', supported: true },
    0x74727565: { name: 'TrueType', supported: true },
    0x4f54544f: { name: 'OpenType/CFF', supported: true },
    0x774f4646: { name: 'WOFF 1.0', supported: true },
    0x774f4632: { name: 'WOFF 2.0', supported: false },
    0x74746366: { name: 'TTC Collection', supported: false },
  };
  const sigInfo = signatures[signature];
  if (!sigInfo)
    return {
      valid: false,
      error: `Неверная сигнатура: 0x${signature.toString(16)}`,
    };
  if (!sigInfo.supported)
    return {
      valid: false,
      error: `Формат "${sigInfo.name}" не поддерживается`,
    };
  const numTables = buffer.readUInt16BE(4);
  if (numTables < 1 || numTables > 64)
    return {
      valid: false,
      error: `Подозрительное количество таблиц: ${numTables}`,
    };
  return { valid: true };
}

// ─────────────────────────────────────────────
// Конвертация шрифта (встроена)
// ─────────────────────────────────────────────
function convertFontBuffer(
  fontBuffer: Buffer,
  formats: string[],
): Record<string, Buffer> {
  const results: Record<string, Buffer> = {};
  const signature = fontBuffer.readUInt32BE(0);
  const detectedFormat =
    signature === 0x4f54544f
      ? 'otf'
      : signature === 0x774f4646
        ? 'woff'
        : 'ttf';

  if (formats.includes('woff') && detectedFormat !== 'woff') {
    const woff = ttf2woff(new Uint8Array(fontBuffer)).buffer;
    results.woff = Buffer.from(woff);
  }
  if (formats.includes('woff2')) {
    const woff2 = ttf2woff2(fontBuffer);
    results.woff2 = Buffer.from(woff2);
  }
  return results;
}

// ─────────────────────────────────────────────
// Запуск встроенного бэкенда
// ─────────────────────────────────────────────
function startBackend() {
  const expressApp = express();
  expressApp.use(cors());

  const storage = multer.memoryStorage();
  const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req: any, file: any, cb: any) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (['.ttf', '.otf', '.woff'].includes(ext)) cb(null, true);
      else cb(new Error('Только файлы .ttf, .otf, .woff'));
    },
  });

  expressApp.post(
    '/api/convert',
    upload.single('font'),
    (req: any, res: any) => {
      try {
        if (!req.file)
          return res.status(400).json({ error: 'Файл не предоставлен' });

        const formats = req.body.formats
          ? JSON.parse(req.body.formats)
          : ['woff', 'woff2'];
        const validation = validateFontHeader(req.file.buffer);
        if (!validation.valid)
          throw new Error(validation.error || 'Неверный формат шрифта');

        const converted = convertFontBuffer(req.file.buffer, formats);
        const files: Record<string, any> = {};

        for (const [fmt, buf] of Object.entries(converted)) {
          files[fmt] = {
            filename: `${path.parse(req.file.originalname).name}.${fmt}`,
            mimeType: fmt === 'woff' ? 'font/woff' : 'font/woff2',
            data: buf.toString('base64'),
            size: buf.length,
          };
        }

        res.json({
          originalName: path.parse(req.file.originalname).name,
          files,
        });
      } catch (err: any) {
        console.error('❌ Ошибка конвертации:', err);
        res
          .status(500)
          .json({ error: err.message || 'Ошибка при конвертации шрифта' });
      }
    },
  );

  expressApp.get('/api/health', (req, res) =>
    res.json({ status: 'ok', service: 'embedded-backend' }),
  );

  const PORT = 3001;
  server = expressApp.listen(PORT, '127.0.0.1', () => {
    console.log(`🔧 Встроенный бэкенд запущен на http://127.0.0.1:${PORT}`);
  });
}

// ─────────────────────────────────────────────
// Создание окна Electron
// ─────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // 🔹 Логирование для отладки
  console.log('🔍 Debug info:');
  console.log('  - app.isPackaged:', app.isPackaged);
  console.log('  - process.env.ELECTRON_IS_DEV:', process.env.ELECTRON_IS_DEV);
  console.log('  - isDev:', isDev);
  console.log('  - app.getAppPath():', app.getAppPath());
  console.log('  - __dirname:', __dirname);

  if (isDev) {
    console.log('🌐 Загрузка dev-сервера: http://localhost:5173');
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // 🔹 Надёжный путь к index.html в продакшене
    const appPath = app.getAppPath();
    const indexPath = path.join(appPath, 'dist', 'index.html');

    console.log('📦 Загрузка production-файла:');
    console.log('  - appPath:', appPath);
    console.log('  - indexPath:', indexPath);

    // Проверка существования файла
    const fs = require('fs');
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      console.error('❌ Файл не найден:', indexPath);
      // Попытка альтернативных путей
      const altPath = path.join(appPath, '../dist/index.html');
      if (fs.existsSync(altPath)) {
        console.log('✅ Найден альтернативный путь:', altPath);
        mainWindow.loadFile(altPath);
      } else {
        mainWindow.webContents.loadURL(
          'data:text/html,<h1>❌ index.html не найден</h1><p>Путь: ' +
            indexPath +
            '</p>',
        );
      }
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─────────────────────────────────────────────
// Инициализация приложения
// ─────────────────────────────────────────────
app.whenReady().then(() => {
  startBackend();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  if (server) {
    server.close(() => console.log('🔌 Встроенный бэкенд остановлен'));
  }
});
