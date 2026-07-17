import { getUserDatabase } from './userDatabase';

export type StoredLanguage = 'uk' | 'en';

export const DEFAULT_LANGUAGE: StoredLanguage = 'en';

export async function getCurrentLanguage(): Promise<StoredLanguage> {
  const database = await getUserDatabase();
  const row = await database.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = 'current_language' LIMIT 1`,
  );

  if (row?.value === 'uk' || row?.value === 'en') {
    return row.value;
  }

  await setCurrentLanguage(DEFAULT_LANGUAGE);
  return DEFAULT_LANGUAGE;
}

export async function setCurrentLanguage(language: StoredLanguage) {
  const database = await getUserDatabase();
  await database.runAsync(
    `INSERT INTO settings (key, value, updated_at)
     VALUES ('current_language', ?, unixepoch())
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       updated_at = excluded.updated_at`,
    [language],
  );
}
