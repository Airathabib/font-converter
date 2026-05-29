import { useState, useCallback, useRef } from 'react';
import { convertFont, FontFormat, ConvertedFile } from '@/services/api';

export interface FontFile {
  id: string;
  name: string;
  file: File;
  size: number;
  status: 'pending' | 'valid' | 'invalid' | 'converting' | 'done' | 'error';
  progress: number;
  error?: string;

  convertedFiles?: Partial<Record<FontFormat, ConvertedFile>>;
}

export interface ConvertOptions {
  formats: FontFormat[];
}

interface UseFontConverterReturn {
  files: FontFile[];
  isProcessing: boolean;
  addFiles: (files: FileList | File[]) => void;
  removeFile: (id: string) => void;
  startConversion: (options: ConvertOptions) => Promise<void>;
  cancelConversion: () => void;
  getStats: () => { total: number; done: number; errors: number };
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function useFontConverter(): UseFontConverterReturn {
  const [files, setFiles] = useState<FontFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const filesArray = Array.from(
      fileList instanceof FileList ? fileList : fileList,
    );

    const newFiles: FontFile[] = filesArray
      .filter((file) =>
        ['.ttf', '.otf', '.woff'].includes(
          file.name.split('.').pop()?.toLowerCase() || '',
        ),
      )
      .map((file) => ({
        id: generateId(),
        name: file.name,
        file,
        size: file.size,
        status: 'valid' as const,
        progress: 0,
      }));

    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const startConversion = useCallback(
    async (options: ConvertOptions) => {
      const validFiles = files.filter((f) => f.status === 'valid');
      if (validFiles.length === 0) return;

      setIsProcessing(true);
      abortControllerRef.current = new AbortController();

      for (const fontFile of validFiles) {
        if (abortControllerRef.current?.signal.aborted) break;

        setFiles((prev) =>
          prev.map((f) =>
            f.id === fontFile.id
              ? { ...f, status: 'converting', progress: 0 }
              : f,
          ),
        );

        try {
          const result = await convertFont(fontFile.file, options.formats);

          setFiles((prev) =>
            prev.map((f) =>
              f.id === fontFile.id
                ? {
                    ...f,
                    status: 'done',
                    progress: 100,
                    convertedFiles: result.files,
                  }
                : f,
            ),
          );
        } catch (error) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fontFile.id
                ? {
                    ...f,
                    status: 'error',
                    error:
                      error instanceof Error
                        ? error.message
                        : 'Ошибка конвертации',
                  }
                : f,
            ),
          );
        }
      }

      setIsProcessing(false);
      abortControllerRef.current = null;
    },
    [files],
  );

  const cancelConversion = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsProcessing(false);
  }, []);

  const getStats = useCallback(
    () => ({
      total: files.length,
      done: files.filter((f) => f.status === 'done').length,
      errors: files.filter(
        (f) => f.status === 'error' || f.status === 'invalid',
      ).length,
    }),
    [files],
  );

  return {
    files,
    isProcessing,
    addFiles,
    removeFile,
    startConversion,
    cancelConversion,
    getStats,
  };
}
