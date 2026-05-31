import React from 'react';
import cls from './ProgressBar.module.scss';

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
    <div className={cls.bar}>
      <div
        className={`${cls.bar__fill} ${success ? cls['bar__fill--success'] : ''}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
    {label && (
      <div className={cls.label}>
        <span>{label}</span>
        <span>{Math.round(value)}%</span>
      </div>
    )}
  </div>
);
