import fs from 'fs';

export function validateTTFHeader(buffer: Buffer): {
  isValid: boolean;
  error?: string;
} {
  if (buffer.length < 12) {
    return { isValid: false, error: 'Файл слишком мал для TTF' };
  }

  const sfntVersion = buffer.readUInt32BE(0);
  const validVersions = [0x00010000, 0x74727565];

  if (!validVersions.includes(sfntVersion)) {
    return {
      isValid: false,
      error: 'Неверная сигнатура TTF. Ожидался TrueType шрифт.',
    };
  }

  const numTables = buffer.readUInt16BE(4);
  if (numTables < 5 || numTables > 50) {
    return {
      isValid: false,
      error: `Подозрительное количество таблиц: ${numTables}`,
    };
  }

  return { isValid: true };
}

export async function validateTTFFile(
  filePath: string,
): Promise<{ isValid: boolean; error?: string }> {
  try {
    const fd = await fs.promises.open(filePath, 'r');
    const buffer = Buffer.alloc(12);
    await fd.read(buffer, 0, 12, 0);
    await fd.close();

    return validateTTFHeader(buffer);
  } catch (err) {
    return {
      isValid: false,
      error: `Ошибка чтения: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
    };
  }
}
