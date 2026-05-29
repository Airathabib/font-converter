export interface ValidateResult {
  valid: boolean;
  error?: string;
  format?: string;
  tables?: number;
  detected?: string;
}

export function validateFontHeader(buffer: Buffer): ValidateResult {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    return {
      valid: false,
      error: 'Некорректный файл: слишком маленький размер',
    };
  }

  const signature = buffer.readUInt32BE(0);

  const signatures: Record<number, { name: string; supported: boolean }> = {
    0x00010000: { name: 'TrueType (\\x00\\x01\\x00\\x00)', supported: true },
    0x74727565: { name: 'TrueType ("true")', supported: true },
    0x4f54544f: { name: 'OpenType/CFF ("OTTO")', supported: true },
    0x774f4646: { name: 'WOFF 1.0', supported: true },
    0x774f4632: { name: 'WOFF 2.0', supported: false },
    0x74746366: { name: 'TTC Collection', supported: false },
  };

  const sigInfo = signatures[signature];

  if (!sigInfo) {
    return {
      valid: false,
      error: `Неверная сигнатура шрифта: 0x${signature.toString(16)}`,
      detected: `0x${signature.toString(16)}`,
    };
  }

  if (!sigInfo.supported) {
    return {
      valid: false,
      error: `Формат "${sigInfo.name}" не поддерживается для конвертации`,
    };
  }

  const numTables = buffer.readUInt16BE(4);
  if (numTables < 1 || numTables > 64) {
    return {
      valid: false,
      error: `Подозрительное количество таблиц: ${numTables}`,
    };
  }

  return { valid: true, format: sigInfo.name, tables: numTables };
}
