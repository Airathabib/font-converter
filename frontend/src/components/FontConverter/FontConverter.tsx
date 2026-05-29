import React, { useState, useCallback } from 'react';
import { convertFont, FontFormat, ConvertedFile } from '../../services/api';
import styles from './FontConverter.module.scss';

interface Props {
  onPickDirectory?: () => Promise<string[] | null>;
  onPickOutputPath?: () => Promise<string | null>;
}

export const FontConverter: React.FC<Props> = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formats, setFormats] = useState<FontFormat[]>(['woff', 'woff2']);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savePrefix, setSavePrefix] = useState('');

  const [convertedFiles, setConvertedFiles] = useState<Partial<
    Record<FontFormat, ConvertedFile>
  > | null>(null);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      const ext = file?.name.split('.').pop()?.toLowerCase();

      if (file && ['ttf', 'otf', 'woff'].includes(ext || '')) {
        setSelectedFile(file);
        setError(null);
        setConvertedFiles(null);
        setSavePrefix(file.name.replace(/\.(ttf|otf|woff)$/i, ''));
      } else {
        setError('Поддерживаются файлы .ttf, .otf, .woff');
        setSelectedFile(null);
      }
    },
    [],
  );

  const handleFormatToggle = (format: FontFormat) => {
    setFormats((prev) =>
      prev.includes(format)
        ? prev.filter((f) => f !== format)
        : [...prev, format],
    );
  };

  const handleConvert = async () => {
    if (!selectedFile || formats.length === 0) {
      setError('Выберите файл и хотя бы один формат');
      return;
    }

    setIsConverting(true);
    setError(null);

    try {
      const result = await convertFont(selectedFile, formats);
      setConvertedFiles(result.files);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка конвертации');
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = (file: ConvertedFile, format: FontFormat) => {
    const filename = savePrefix ? `${savePrefix}.${format}` : file.filename;
    const link = document.createElement('a');
    link.href = `data:${file.mimeType};base64,${file.data}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>🔤 Конвертер шрифтов</h2>

      <section className={styles.section}>
        <label className={styles.label}>
          1. Выберите файл шрифта (.ttf, .otf, .woff):
        </label>
        <input
          type='file'
          accept='.ttf,.otf,.woff'
          onChange={handleFileSelect}
          className={styles.fileInput}
          id='file-input'
        />
        {selectedFile && (
          <p className={styles.filename}>✓ {selectedFile.name}</p>
        )}
      </section>

      <section className={styles.section}>
        <label className={styles.label}>2. Форматы:</label>
        <div className={styles.formatGroup}>
          {(['woff', 'woff2'] as FontFormat[]).map((fmt) => (
            <label key={fmt} className={styles.checkboxLabel}>
              <input
                type='checkbox'
                checked={formats.includes(fmt)}
                onChange={() => handleFormatToggle(fmt)}
              />
              <span className={styles.formatBadge}>{fmt.toUpperCase()}</span>
            </label>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <label className={styles.label}>3. Имя файла:</label>
        <input
          type='text'
          value={savePrefix}
          onChange={(e) =>
            setSavePrefix(e.target.value.replace(/[<>:"|?*\\]/g, ''))
          }
          placeholder='Введите имя'
          className={styles.textInput}
          disabled={!convertedFiles}
        />
      </section>

      <button
        onClick={handleConvert}
        disabled={isConverting || !selectedFile || formats.length === 0}
        className={`${styles.btn} ${!selectedFile || formats.length === 0 ? styles.btnDisabled : ''}`}
      >
        {isConverting ? '⏳ Конвертация...' : '🚀 Конвертировать'}
      </button>

      {error && <p className={styles.error}>❌ {error}</p>}

      {convertedFiles && (
        <section className={styles.results}>
          <h3 className={styles.resultsTitle}>✅ Готово!</h3>
          {(Object.entries(convertedFiles) as [FontFormat, ConvertedFile][])

            .filter(([_, file]) => file !== undefined)
            .map(([format, file]) => (
              <div key={format} className={styles.resultItem}>
                <span className={styles.formatBadge}>
                  {format.toUpperCase()}
                </span>
                <span className={styles.resultFilename}>
                  {savePrefix || file.filename}.{format}
                </span>
                <button
                  onClick={() => handleDownload(file, format)}
                  className={styles.downloadBtn}
                >
                  ⬇️ Скачать
                </button>
              </div>
            ))}
        </section>
      )}
    </div>
  );
};
