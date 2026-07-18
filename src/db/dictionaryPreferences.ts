import {
  contentDictionaryExists,
  getDictionaries,
  type DictionarySummary,
} from './dictionaryRegistry';
import { getContentDatabase } from './contentDatabase';
import { getUserDatabase } from './userDatabase';

export interface DictionarySelection extends DictionarySummary {
  is_enabled: boolean;
  studied_word_count: number;
  progress_percent: number;
}

interface StoredPreference {
  dictionary_key: string;
  is_enabled: number;
}

export async function getDictionarySelections({
  displayLanguage = 'en',
  translationLanguage,
}: {
  displayLanguage?: string;
  translationLanguage?: string;
} = {}): Promise<DictionarySelection[]> {
  const [dictionaries, database] = await Promise.all([
    getDictionaries({ displayLanguage, translationLanguage }),
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

  const contentDatabase = await getContentDatabase();
  const dictionaryKeys = dictionaries.map((dictionary) => dictionary.dictionary_key);
  const placeholders = dictionaryKeys.map(() => '?').join(', ');
  const [dictionaryWords, studiedWords] = dictionaryKeys.length > 0
    ? await Promise.all([
        contentDatabase.getAllAsync<{ dictionary_key: string; word: string }>(
          `SELECT dictionary_key, word
           FROM dictionary_items
           WHERE dictionary_key IN (${placeholders})`,
          dictionaryKeys,
        ),
        database.getAllAsync<{ word: string }>('SELECT word FROM user_progress'),
      ])
    : [[], []];
  const studiedWordSet = new Set(studiedWords.map((entry) => entry.word.toLowerCase()));
  const studiedCountByDictionary = new Map<string, number>();

  for (const entry of dictionaryWords) {
    if (studiedWordSet.has(entry.word.toLowerCase())) {
      studiedCountByDictionary.set(
        entry.dictionary_key,
        (studiedCountByDictionary.get(entry.dictionary_key) ?? 0) + 1,
      );
    }
  }

  return dictionaries.map((dictionary) => {
    const studiedWordCount = studiedCountByDictionary.get(dictionary.dictionary_key) ?? 0;

    return {
      ...dictionary,
      is_enabled: preferences.get(dictionary.dictionary_key) ?? false,
      studied_word_count: studiedWordCount,
      progress_percent: dictionary.word_count === 0
        ? 0
        : Math.round((studiedWordCount / dictionary.word_count) * 100),
    };
  });
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

export async function getEnabledDictionaryKeys(
  translationLanguage?: string,
): Promise<string[]> {
  const selections = await getDictionarySelections({ translationLanguage });
  return selections
    .filter((dictionary) => dictionary.is_enabled)
    .map((dictionary) => dictionary.dictionary_key);
}
