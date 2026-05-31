// frontend/electron/main.ts
import { app, BrowserWindow } from 'electron';
import path from 'path';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import ttf2woff from 'ttf2woff';
import ttf2woff2 from 'ttf2woff2';
import AdmZip from 'adm-zip';
import sharp from 'sharp';

// ─────────────────────────────────────────────
// 🔹 Глобальные переменные
// ─────────────────────────────────────────────
let mainWindow: BrowserWindow | null = null;
let server: any = null;

// 🔹 Надёжное определение режима: проверяем наличие production-файлов
const fs = require('fs');
const appPath = app.getAppPath();
const hasProductionFiles = fs.existsSync(
	path.join(appPath, 'dist', 'index.html')
);
const isDev = process.env.ELECTRON_IS_DEV === '1' || !hasProductionFiles;

console.log(
	`🔍 Режим: ${isDev ? '🔧 DEV' : '📦 PROD'} | hasProductionFiles: ${hasProductionFiles}`
);

// ─────────────────────────────────────────────
// 🔹 Валидация шрифта
// ─────────────────────────────────────────────
function validateFontHeader(buffer: Buffer): {
	valid: boolean;
	error?: string;
} {
	if (!Buffer.isBuffer(buffer) || buffer.length < 12)
		return { valid: false, error: 'Файл слишком маленький' };
	const signature = buffer.readUInt32BE(0);
	const signatures: Record<number, { name: string; supported: boolean }> = {
		0x00010000: { name: 'TrueType', supported: true },
		0x74727565: { name: 'TrueType', supported: true },
		0x4f54544f: { name: 'OpenType/CFF', supported: true },
		0x774f4646: { name: 'WOFF 1.0', supported: true },
		0x774f4632: { name: 'WOFF 2.0', supported: false },
		0x74746366: { name: 'TTC Collection', supported: false }
	};
	const sigInfo = signatures[signature];
	if (!sigInfo)
		return {
			valid: false,
			error: `Неверная сигнатура: 0x${signature.toString(16)}`
		};
	if (!sigInfo.supported)
		return {
			valid: false,
			error: `Формат "${sigInfo.name}" не поддерживается`
		};
	const numTables = buffer.readUInt16BE(4);
	if (numTables < 1 || numTables > 64)
		return {
			valid: false,
			error: `Подозрительное количество таблиц: ${numTables}`
		};
	return { valid: true };
}

// ─────────────────────────────────────────────
// 🔹 Определение формата шрифта
// ─────────────────────────────────────────────
function detectFontFormat(buffer: Buffer): 'ttf' | 'otf' | 'woff' | 'unknown' {
	if (!Buffer.isBuffer(buffer) || buffer.length < 4) return 'unknown';
	const signature = buffer.readUInt32BE(0);
	if (signature === 0x00010000 || signature === 0x74727565) return 'ttf';
	if (signature === 0x4f54544f) return 'otf';
	if (signature === 0x774f4646) return 'woff';
	return 'unknown';
}

// ─────────────────────────────────────────────
// 🔹 Конвертация шрифта
// ─────────────────────────────────────────────
function convertFontBuffer(
	fontBuffer: Buffer,
	formats: string[]
): Record<string, Buffer> {
	const results: Record<string, Buffer> = {};
	const detectedFormat = detectFontFormat(fontBuffer);
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
// 🔹 Запуск встроенного бэкенда
// ─────────────────────────────────────────────
function startBackend() {
	const expressApp = express();
	expressApp.use(cors());

	// 🔹 Upload для шрифтов
	const uploadFonts = multer({
		storage: multer.memoryStorage(),
		limits: { fileSize: 50 * 1024 * 1024 },
		fileFilter: (req: any, file: any, cb: any) => {
			const ext = path.extname(file.originalname).toLowerCase();
			if (['.ttf', '.otf', '.woff'].includes(ext)) cb(null, true);
			else cb(new Error('Только файлы .ttf, .otf, .woff'));
		}
	});

	// 🔹 Upload для фавиконок
	const uploadImages = multer({
		storage: multer.memoryStorage(),
		limits: { fileSize: 10 * 1024 * 1024 },
		fileFilter: (req: any, file: any, cb: any) => {
			const ext = path.extname(file.originalname).toLowerCase();
			if (['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(ext))
				cb(null, true);
			else cb(new Error('Только изображения: .png, .jpg, .jpeg, .webp, .svg'));
		}
	});

	// ─────────────────────────────────────────────
	// 🔹 Эндпоинт: конвертация шрифтов
	// ─────────────────────────────────────────────
	expressApp.post(
		'/api/convert',
		uploadFonts.single('font'),
		(req: any, res: any) => {
			try {
				if (!req.file)
					return res.status(400).json({ error: 'Файл не предоставлен' });
				const formats = req.body.formats
					? JSON.parse(req.body.formats)
					: ['woff', 'woff2'];
				const detectedFormat = detectFontFormat(req.file.buffer);
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
						sourceFormat: detectedFormat
					};
				}
				res.json({
					originalName: path.parse(req.file.originalname).name,
					sourceFormat: detectedFormat,
					files
				});
			} catch (err: any) {
				console.error('❌ Ошибка конвертации:', err);
				res
					.status(500)
					.json({ error: err.message || 'Ошибка при конвертации шрифта' });
			}
		}
	);

	// ─────────────────────────────────────────────
	// 🔹 Эндпоинт: генерация фавиконок
	// ─────────────────────────────────────────────
	expressApp.post(
		'/api/generate-favicons',
		uploadImages.single('image'),
		async (req: any, res: any) => {
			try {
				if (!req.file)
					return res.status(400).json({ error: 'Изображение не выбрано' });
				const formats = req.body.formats
					? JSON.parse(req.body.formats)
					: ['favicon.ico'];
				const appName = req.body.appName || 'My App';
				const zip = new AdmZip();
				let filesAdded = 0;

				const targets: Record<string, number> = {
					'favicon-16x16.png': 16,
					'favicon-32x32.png': 32,
					'apple-touch-icon.png': 180,
					'android-chrome-192x192.png': 192,
					'android-chrome-512x512.png': 512
				};

				for (const [filename, size] of Object.entries(targets)) {
					if (formats.includes(filename)) {
						const buffer = await sharp(req.file.buffer)
							.resize(size, size, {
								fit: 'contain',
								background: { r: 255, g: 255, b: 255, alpha: 0 }
							})
							.png()
							.toBuffer();
						zip.addFile(filename, buffer);
						console.log(`✅ Сгенерирован: ${filename}`);
						filesAdded++;
					}
				}

				if (formats.includes('favicon.ico')) {
					try {
						const ico = require('sharp-ico');
						const sizes = [16, 32, 48];
						const buffers = [];
						for (const size of sizes) {
							const buf = await sharp(req.file.buffer)
								.resize(size, size, {
									fit: 'contain',
									background: { r: 255, g: 255, b: 255, alpha: 0 }
								})
								.png()
								.toBuffer();
							buffers.push(buf);
						}
						const icoBuffer = await ico.encode(buffers);
						zip.addFile('favicon.ico', icoBuffer);
						console.log('✅ Добавлен: favicon.ico');
						filesAdded++;
					} catch (e: any) {
						console.warn('⚠️ Не удалось создать .ico:', e.message);
						const pngBuf = await sharp(req.file.buffer)
							.resize(32, 32)
							.png()
							.toBuffer();
						zip.addFile('favicon.ico', pngBuf);
						filesAdded++;
					}
				}

				if (formats.includes('safari-pinned-tab.svg')) {
					const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#3b82f6" rx="20"/><text x="50" y="65" font-size="50" text-anchor="middle" fill="white" font-family="sans-serif">F</text></svg>`;
					zip.addFile('safari-pinned-tab.svg', Buffer.from(svg));
					console.log('✅ Добавлен: safari-pinned-tab.svg');
					filesAdded++;
				}

				const htmlParts: string[] = [];
				if (
					formats.includes('favicon.ico') ||
					formats.includes('favicon-32x32.png')
				)
					htmlParts.push(
						'<link rel="icon" type="image/x-icon" href="/favicon.ico">'
					);
				if (formats.includes('apple-touch-icon.png'))
					htmlParts.push(
						'<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">'
					);
				if (formats.includes('android-chrome-192x192.png'))
					htmlParts.push(
						'<link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png">'
					);
				if (formats.includes('safari-pinned-tab.svg'))
					htmlParts.push(
						'<link rel="mask-icon" href="/safari-pinned-tab.svg" color="#3b82f6">'
					);
				const html = htmlParts.length
					? `<!-- Favicons for ${appName} -->\n` + htmlParts.join('\n')
					: '';
				if (html) zip.addFile('favicon-head.html', Buffer.from(html));

				const manifest = {
					name: appName,
					short_name: appName.slice(0, 12),
					start_url: '/',
					display: 'standalone',
					background_color: '#ffffff',
					theme_color: '#3b82f6',
					icons: []
				};
				zip.addFile(
					'site.webmanifest',
					Buffer.from(JSON.stringify(manifest, null, 2))
				);

				console.log(`🎨 Готово: ${filesAdded} файлов`);
				res.set('Content-Type', 'application/zip');
				res.send(zip.toBuffer());
			} catch (error: any) {
				console.error('❌ [Favicon] Ошибка:', error);
				res.status(500).json({ error: error.message || 'Ошибка генерации' });
			}
		}
	);

	// ─────────────────────────────────────────────
	// 🔹 Запуск сервера
	// ─────────────────────────────────────────────
	const PORT = 3001;
	server = expressApp.listen(PORT, '127.0.0.1', () => {
		console.log(`🔧 Встроенный бэкенд запущен на http://127.0.0.1:${PORT}`);
	});
}

// ─────────────────────────────────────────────
// 🔹 Создание окна
// ─────────────────────────────────────────────
function createWindow() {
	if (mainWindow) {
		console.log('⚠️ Окно уже существует, фокусируем');
		if (mainWindow.isMinimized()) mainWindow.restore();
		mainWindow.focus();
		return;
	}

	mainWindow = new BrowserWindow({
		width: 900,
		height: 700,
		minWidth: 800,
		minHeight: 600,
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			preload: path.join(__dirname, 'preload.js'),
			sandbox: false
		}
	});

	// 🔹 CSP
	mainWindow.webContents.session.webRequest.onHeadersReceived(
		(details, callback) => {
			const csp = isDev
				? "default-src 'self' 'unsafe-inline' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5173; style-src 'self' 'unsafe-inline' http://localhost:5173; connect-src 'self' http://localhost:5173 ws://localhost:5173 http://127.0.0.1:5173 ws://127.0.0.1:5173 http://127.0.0.1:3001; img-src 'self' data: blob:; font-src 'self';"
				: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' http://127.0.0.1:3001; img-src 'self' data: blob:; font-src 'self';";
			callback({
				responseHeaders: {
					...details.responseHeaders,
					'Content-Security-Policy': [csp]
				}
			});
		}
	);

	if (isDev) {
		console.log('🌐 Загрузка Vite: http://localhost:5173');
		mainWindow.loadURL('http://localhost:5173');
		mainWindow.webContents.openDevTools();
	} else {
		const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
		console.log('📦 Загрузка Production:', indexPath);
		if (fs.existsSync(indexPath)) {
			mainWindow.loadFile(indexPath);
		} else {
			console.error('❌ Файл не найден:', indexPath);
			mainWindow.loadURL(
				`data:text/html,<html><head><meta charset="UTF-8"><title>Ошибка</title></head><body style="font-family:system-ui;padding:40px;background:#1e293b;color:#f1f5f9"><h1 style="color:#ef4444">❌ index.html не найден</h1><p>Путь: <code>${indexPath}</code></p></body></html>`
			);
		}
	}

	mainWindow.on('closed', () => {
		mainWindow = null;
	});
}

// ─────────────────────────────────────────────
// 🔹 Инициализация
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
	if (server) server.close(() => console.log('🔌 Бэкенд остановлен'));
});

// 🔹 Защита от второго экземпляра
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) app.quit();
else {
	app.on('second-instance', () => {
		if (mainWindow) {
			if (mainWindow.isMinimized()) mainWindow.restore();
			mainWindow.focus();
		}
	});
}
