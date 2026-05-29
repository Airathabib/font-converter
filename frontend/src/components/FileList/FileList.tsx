import React from 'react';
import { FontFile } from '@/types/types';
import { ProgressBar } from '../ProgressBar/ProgressBar';
import { formatBytes } from '../utils/fileUtils';

import styles from './FileList.module.scss';
interface Props {
  files: FontFile[];
  onRemove: (id: string) => void;
}

const statusLabels: Record<FontFile['status'], string> = {
  pending: 'Ожидание',
  validating: 'Проверка...',
  valid: '✓ Готов',
  invalid: '✗ Ошибка',
  converting: 'Конвертация...',
  done: '✓ Готово',
  error: '✗ Ошибка',
};

export const FileList: React.FC<Props> = ({ files, onRemove }) => {
  if (files.length === 0) {
    return <p className={styles.empty}>Файлы не выбраны</p>;
  }

  return (
    <div className={styles.list}>
      {files.map((file) => (
        <div key={file.id} className={styles.item}>
          <div className={styles.item__info}>
            <div className={styles.item__name} title={file.name}>
              {file.name}
            </div>
            <div className={styles.item__meta}>
              {formatBytes(file.size)}
              {file.error && (
                <span className={styles.error}> • {file.error}</span>
              )}
            </div>
            {(file.status === 'converting' || file.status === 'done') && (
              <ProgressBar
                value={file.progress}
                success={file.status === 'done'}
              />
            )}
          </div>

          <span
            className={`${styles.item__status} ${styles[`item__status--${file.status}`]}`}
          >
            {statusLabels[file.status]}
          </span>

          <button
            className={styles.item__remove}
            onClick={() => onRemove(file.id)}
            disabled={file.status === 'converting'}
            title='Удалить из списка'
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};


