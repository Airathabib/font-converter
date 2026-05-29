import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer, { StorageEngine, FileFilterCallback } from 'multer';
import path from 'path';
import { convertFontBuffer, FontFormat } from './converter';
import { validateFontHeader } from './utils/validate.Ttf';

interface ConvertedFile {
  filename: string;
  mimeType: string;
  data: string;
  sourceFormat: 'ttf' | 'otf' | 'woff';
}

interface ConvertResponse {
  originalName: string;
  sourceFormat: 'ttf' | 'otf' | 'woff';
  files: Partial<Record<FontFormat, ConvertedFile>>;
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const storage: StorageEngine = multer.memoryStorage();

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (['.ttf', '.otf', '.woff'].includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Поддерживаются только файлы .ttf, .otf, .woff'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter,
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'font-converter' });
});

app.post(
  '/api/convert',
  upload.single('font'),
  async (
    req: Request,
    res: Response<ConvertResponse | { error: string; details?: string }>,
  ) => {
    try {
      if (!req.file?.buffer) {
        return res.status(400).json({ error: 'Файл шрифта не предоставлен' });
      }

      let formats: FontFormat[] = ['woff', 'woff2'];
      if (req.body.formats) {
        formats = Array.isArray(req.body.formats)
          ? req.body.formats
          : JSON.parse(req.body.formats);
      }

      const validFormats = formats.filter(
        (f: string): f is FontFormat => f === 'woff' || f === 'woff2',
      );

      if (validFormats.length === 0) {
        return res.status(400).json({ error: 'Укажите woff или woff2' });
      }

      const validation = validateFontHeader(req.file.buffer);
      if (!validation.valid) {
        return res
          .status(400)
          .json({ error: validation.error || 'Невалидный файл шрифта' });
      }

      const ext = path
        .extname(req.file.originalname)
        .toLowerCase()
        .replace('.', '') as 'ttf' | 'otf' | 'woff';

      console.log(
        `🔄 Конвертация: ${req.file.originalname} (${validation.format}) → ${validFormats.join(', ')}`,
      );

      const { results, sourceFormat } = convertFontBuffer(
        req.file.buffer,
        validFormats,
        ext,
      );

      const originalName = path.parse(req.file.originalname).name;
      const response: ConvertResponse = {
        originalName,
        sourceFormat,
        files: {},
      };

      for (const format of validFormats) {
        if (results[format]?.length) {
          response.files[format] = {
            filename: `${originalName}.${format}`,
            mimeType: format === 'woff' ? 'font/woff' : 'font/woff2',
            data: results[format].toString('base64'),
            sourceFormat,
          };
        }
      }

      if (Object.keys(response.files).length === 0) {
        return res.status(400).json({
          error: 'Конвертация не требуется',
          details: `Файл уже в одном из запрошенных форматов`,
        });
      }

      res.json(response);
    } catch (error) {
      console.error('❌ Ошибка конвертации:', error);
      const message =
        error instanceof Error ? error.message : 'Неизвестная ошибка';
      res
        .status(500)
        .json({ error: 'Ошибка при конвертации', details: message });
    }
  },
);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res
        .status(400)
        .json({ error: 'Файл слишком большой (макс. 50MB)' });
    }
    return res.status(400).json({ error: `Ошибка загрузки: ${err.message}` });
  }
  next(err);
});

app.use('*', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend запущен на порту ${PORT}`);
  console.log(`📡 Health: http://localhost:${PORT}/api/health`);
});

export default app;
