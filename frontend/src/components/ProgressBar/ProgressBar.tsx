import React from 'react';
import styles from './ProgressBar.module.scss';

interface Props {
  value: number;
  label?: string;
  success?: boolean;
}

export const ProgressBar: React.FC<Props> = ({
  value,
  label,
  success = false,
}) => (
  <div>
    <div className={styles.bar}>
      <div
        className={`${styles.bar__fill} ${success ? styles['bar__fill--success'] : ''}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
    {label && (
      <div className={styles.label}>
        <span>{label}</span>
        <span>{Math.round(value)}%</span>
      </div>
    )}
  </div>
);
