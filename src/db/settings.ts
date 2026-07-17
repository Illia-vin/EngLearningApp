import { getUserDatabase } from './userDatabase';

export type StoredLanguage = 'uk' | 'en' | 'es';
export type StoredTranslationLanguage = 'uk' | 'es';

export const DEFAULT_LANGUAGE: StoredLanguage = 'en';
export const DEFAULT_TRANSLATION_LANGUAGE: StoredTranslationLanguage = 'uk';

export async function getCurrentLanguage(): Promise<StoredLanguage> {
  const database = await getUserDatabase();
  const row = await database.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = 'current_language' LIMIT 1`,
  );

  if (row?.value === 'uk' || row?.value === 'en' || row?.value === 'es') {
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

export async function getCurrentTranslationLanguage(): Promise<StoredTranslationLanguage> {
  const database = await getUserDatabase();
  const row = await database.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = 'translation_language' LIMIT 1`,
  );

  if (row?.value === 'uk' || row?.value === 'es') {
    return row.value;
  }

  await setCurrentTranslationLanguage(DEFAULT_TRANSLATION_LANGUAGE);
  return DEFAULT_TRANSLATION_LANGUAGE;
}

export async function setCurrentTranslationLanguage(
  language: StoredTranslationLanguage,
) {
  const database = await getUserDatabase();
  await database.runAsync(
    `INSERT INTO settings (key, value, updated_at)
     VALUES ('translation_language', ?, unixepoch())
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       updated_at = excluded.updated_at`,
    [language],
  );
}
