import { getUserDatabase } from './userDatabase';

export type StoredLanguage = 'uk' | 'en' | 'es';
export type StoredTranslationLanguage = 'uk' | 'es';
export type StoredEnglishVariant = 'british' | 'american';

export const DEFAULT_LANGUAGE: StoredLanguage = 'en';
export const DEFAULT_TRANSLATION_LANGUAGE: StoredTranslationLanguage = 'uk';
export const DEFAULT_ENGLISH_VARIANT: StoredEnglishVariant = 'british';

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

export async function getCurrentEnglishVariant(): Promise<StoredEnglishVariant> {
  const database = await getUserDatabase();
  const row = await database.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = 'english_variant' LIMIT 1`,
  );
  if (row?.value === 'british' || row?.value === 'american') return row.value;
  await setCurrentEnglishVariant(DEFAULT_ENGLISH_VARIANT);
  return DEFAULT_ENGLISH_VARIANT;
}

export async function setCurrentEnglishVariant(variant: StoredEnglishVariant) {
  const database = await getUserDatabase();
  await database.runAsync(
    `INSERT INTO settings (key, value, updated_at)
     VALUES ('english_variant', ?, unixepoch())
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [variant],
  );
}
