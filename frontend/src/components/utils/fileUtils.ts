import path from 'path';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"|?*\\]/g, '_').trim();
}

export function getOutputPath(options: {
  outputPath: string;
  originalName: string;
  format: string;
  overwrite?: boolean;
}): string {
  const { outputPath, originalName, format, overwrite = false } = options;
  const baseName = path.parse(originalName).name;
  let targetPath = path.join(outputPath, `${baseName}.${format}`);

  if (!overwrite) {
    const fs = require('fs');
    let counter = 1;
    while (fs.existsSync(targetPath)) {
      targetPath = path.join(outputPath, `${baseName}_${counter}.${format}`);
      counter++;
    }
  }

  return targetPath;
}
