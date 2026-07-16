import { db, initDatabase, type StoredLanguage } from './database';

export type { StoredLanguage } from './database';

export const DEFAULT_LANGUAGE: StoredLanguage = 'en';

export async function getCurrentLanguage(): Promise<StoredLanguage> {
  await initDatabase();
  const row = await db.getFirstAsync<{ current_language: string }>(
    'SELECT current_language FROM settings WHERE id = ? LIMIT 1',
    ['app']
  );

  if (row?.current_language === 'uk' || row?.current_language === 'en') {
    return row.current_language;
  }

  await setCurrentLanguage(DEFAULT_LANGUAGE);
  return DEFAULT_LANGUAGE;
}

export async function setCurrentLanguage(language: StoredLanguage) {
  await initDatabase();
  await db.runAsync(
    `INSERT INTO settings (id, current_language)
     VALUES (?, ?)
     ON CONFLICT(id) DO UPDATE SET current_language = excluded.current_language`,
    ['app', language]
  );
}
