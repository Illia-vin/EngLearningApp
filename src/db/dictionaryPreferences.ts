import {
  contentDictionaryExists,
  getDictionaries,
  type DictionarySummary,
} from './dictionaryRegistry';
import { getUserDatabase } from './userDatabase';

export interface DictionarySelection extends DictionarySummary {
  is_enabled: boolean;
}

interface StoredPreference {
  dictionary_key: string;
  is_enabled: number;
}

export async function getDictionarySelections(
  interfaceLanguage = 'en',
): Promise<DictionarySelection[]> {
  const [dictionaries, database] = await Promise.all([
    getDictionaries(interfaceLanguage),
    getUserDatabase(),
  ]);
  const stored = await database.getAllAsync<StoredPreference>(
    'SELECT dictionary_key, is_enabled FROM dictionary_preferences',
  );
  const preferences = new Map(
    stored.map((preference) => [
      preference.dictionary_key,
      preference.is_enabled === 1,
    ]),
  );

  const missing = dictionaries.filter(
    (dictionary) => !preferences.has(dictionary.dictionary_key),
  );
  if (missing.length > 0) {
    await database.withTransactionAsync(async () => {
      for (const dictionary of missing) {
        const enabled = dictionary.is_default === 1;
        await database.runAsync(
          `INSERT OR IGNORE INTO dictionary_preferences
             (dictionary_key, is_enabled, updated_at)
           VALUES (?, ?, unixepoch())`,
          [dictionary.dictionary_key, enabled ? 1 : 0],
        );
        preferences.set(dictionary.dictionary_key, enabled);
      }
    });
  }

  return dictionaries.map((dictionary) => ({
    ...dictionary,
    is_enabled: preferences.get(dictionary.dictionary_key) ?? false,
  }));
}

export async function setDictionaryEnabled(
  dictionaryKey: string,
  enabled: boolean,
): Promise<void> {
  if (!(await contentDictionaryExists(dictionaryKey))) {
    throw new Error(`Unknown dictionary: ${dictionaryKey}`);
  }

  const database = await getUserDatabase();
  await database.runAsync(
    `INSERT INTO dictionary_preferences
       (dictionary_key, is_enabled, updated_at)
     VALUES (?, ?, unixepoch())
     ON CONFLICT(dictionary_key) DO UPDATE SET
       is_enabled = excluded.is_enabled,
       updated_at = excluded.updated_at`,
    [dictionaryKey, enabled ? 1 : 0],
  );
}

export async function getEnabledDictionaryKeys(): Promise<string[]> {
  const selections = await getDictionarySelections('en');
  return selections
    .filter((dictionary) => dictionary.is_enabled)
    .map((dictionary) => dictionary.dictionary_key);
}
