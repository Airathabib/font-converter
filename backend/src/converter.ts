import path from 'path';
import ttf2woff from 'ttf2woff';
import ttf2woff2 from 'ttf2woff2';

import { validateFontHeader, ValidateResult } from './utils//validate.Ttf';

// ─────────────────────────────────────────────
// Типы
// ─────────────────────────────────────────────
export type FontFormat = 'woff' | 'woff2';

export interface ConvertedFile {
  filename: string;
  mimeType: string;
  data: string;
  size: number;
}

export interface ConvertResult {
  name: string;
  status: 'success' | 'error';
  error?: string;
  files?: Record<FontFormat, ConvertedFile>;
}

export interface ProgressUpdate {
  current: number;
  total: number;
  name: string;
  status: 'success' | 'error';
  error?: string;
}

export type OnProgressCallback = (progress: ProgressUpdate) => void;

// ─────────────────────────────────────────────
// Конвертация одного буфера
// ─────────────────────────────────────────────
export function convertFontBuffer(
  fontBuffer: Buffer,
  formats: FontFormat[] = ['woff', 'woff2'],
  sourceFormat?: 'ttf' | 'otf' | 'woff',
): {
  results: Partial<Record<FontFormat, Buffer>>;
  sourceFormat: 'ttf' | 'otf' | 'woff';
} {
  let detectedFormat: 'ttf' | 'otf' | 'woff' = sourceFormat || 'ttf';
  const signature = fontBuffer.readUInt32BE(0);

  if (signature === 0x4f54544f) detectedFormat = 'otf';
  else if (signature === 0x774f4646) detectedFormat = 'woff';

  const results: Partial<Record<FontFormat, Buffer>> = {};

  if (formats.includes('woff') && detectedFormat !== 'woff') {
    const woff = ttf2woff(new Uint8Array(fontBuffer)).buffer;
    results.woff = Buffer.from(woff);
  }

  if (formats.includes('woff2')) {
    const woff2 = ttf2woff2(fontBuffer);
    results.woff2 = Buffer.from(woff2);
  }

  return { results, sourceFormat: detectedFormat };
}

// ─────────────────────────────────────────────
// Пакетная конвертация
// ─────────────────────────────────────────────
export async function convertBatch(
  files: Array<{ name: string; buffer: Buffer }>,
  formats: FontFormat[],
  onProgress?: OnProgressCallback,
): Promise<ConvertResult[]> {
  const results: ConvertResult[] = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const { name, buffer } = files[i];

    const validation: ValidateResult = validateFontHeader(buffer);
    if (!validation.valid) {
      results.push({ name, status: 'error', error: validation.error });
      onProgress?.({
        current: i + 1,
        total,
        name,
        status: 'error',
        error: validation.error,
      });
      continue;
    }

    try {
      const { results: converted } = convertFontBuffer(buffer, formats);
      const filesOutput: Partial<Record<FontFormat, ConvertedFile>> = {};

      for (const [format, buf] of Object.entries(converted) as [
        FontFormat,
        Buffer,
      ][]) {
        filesOutput[format] = {
          filename: `${path.parse(name).name}.${format}`,
          mimeType: format === 'woff' ? 'font/woff' : 'font/woff2',
          data: buf.toString('base64'),
          size: buf.length,
        };
      }

      results.push({
        name,
        status: 'success',
        files: filesOutput as Record<FontFormat, ConvertedFile>,
      });
      onProgress?.({ current: i + 1, total, name, status: 'success' });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Неизвестная ошибка';
      results.push({ name, status: 'error', error: errorMessage });
      onProgress?.({
        current: i + 1,
        total,
        name,
        status: 'error',
        error: errorMessage,
      });
    }
  }

  return results;
}

// ─────────────────────────────────────────────
// Конвертация одного файла (для endpoint)
// ─────────────────────────────────────────────
export function convertFont(
  fontBuffer: Buffer,
  formats: FontFormat[] = ['woff', 'woff2'],
): Record<FontFormat, Buffer> {
  const validation = validateFontHeader(fontBuffer);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const { results } = convertFontBuffer(fontBuffer, formats);

  return {
    woff: results.woff || Buffer.alloc(0),
    woff2: results.woff2 || Buffer.alloc(0),
  } as Record<FontFormat, Buffer>;
}
