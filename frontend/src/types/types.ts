export type FontFormat = 'woff' | 'woff2';

export interface FontFile {
  id: string;
  name: string;
  path: string;
  size: number;
  status:
    | 'pending'
    | 'validating'
    | 'valid'
    | 'invalid'
    | 'converting'
    | 'done'
    | 'error';
  error?: string;
  progress: number;
  converted?: Record<FontFormat, { path: string; size: number }>;
}

export interface ConvertOptions {
  formats: FontFormat[];
  outputPath: string;
  overwrite?: boolean;
}

export interface ConvertProgress {
  fileId: string;
  format: FontFormat;
  progress: number;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  info?: {
    tables: string[];
    glyphCount: number;
    unitsPerEm: number;
  };
}
