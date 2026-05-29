export type FontFormat = 'woff' | 'woff2';
export type SourceFormat = 'ttf' | 'otf' | 'woff'; // 👈 Новые форматы

export interface ConvertedFile {
  filename: string;
  mimeType: string;
  data: string;
  sourceFormat: SourceFormat;
}

export interface ConvertResponse {
  originalName: string;
  sourceFormat: SourceFormat;
  files: Partial<Record<FontFormat, ConvertedFile>>;
}

export interface ApiError {
  error: string;
  details?: string;
}

const API_BASE = 'http://localhost:3001/api';

export async function convertFont(
  file: File,
  formats: FontFormat[] = ['woff', 'woff2'],
): Promise<ConvertResponse> {
  const formData = new FormData();
  formData.append('font', file);
  formData.append('formats', JSON.stringify(formats));

  const response = await fetch(`${API_BASE}/convert`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      error: 'Ошибка сети',
    }));
    throw new Error(error.details || error.error || 'Неизвестная ошибка');
  }

  return response.json();
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}
