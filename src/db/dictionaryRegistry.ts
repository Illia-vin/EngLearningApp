import { getContentDatabase } from './contentDatabase';

export interface DictionarySummary {
  dictionary_key: string;
  name: string;
  is_default: number;
  translation_languages: string;
  word_count: number;
}

export async function getDictionaries({
  displayLanguage = 'en',
  translationLanguage,
  dictionaryKey,
}: {
  displayLanguage?: string;
  translationLanguage?: string;
  dictionaryKey?: string;
} = {}): Promise<DictionarySummary[]> {
  const database = await getContentDatabase();
  const languageFilter = translationLanguage
    ? `INNER JOIN dictionary_languages AS supported_language
         ON supported_language.dictionary_key = dictionaries.dictionary_key
        AND supported_language.language = ?`
    : '';
  const dictionaryFilter = dictionaryKey
    ? 'WHERE dictionaries.dictionary_key = ?'
    : '';

  return database.getAllAsync<DictionarySummary>(
    `SELECT
       dictionaries.dictionary_key,
       COALESCE(localized_name.name, english_name.name, dictionaries.dictionary_key) AS name,
       dictionaries.is_default,
       GROUP_CONCAT(DISTINCT dictionary_languages.language) AS translation_languages,
       COUNT(DISTINCT dictionary_items.word) AS word_count
     FROM dictionaries
     ${languageFilter}
     LEFT JOIN dictionary_names AS localized_name
       ON localized_name.dictionary_key = dictionaries.dictionary_key
      AND localized_name.language = ?
     LEFT JOIN dictionary_names AS english_name
       ON english_name.dictionary_key = dictionaries.dictionary_key
      AND english_name.language = 'en'
     LEFT JOIN dictionary_languages
       ON dictionary_languages.dictionary_key = dictionaries.dictionary_key
     LEFT JOIN dictionary_items
       ON dictionary_items.dictionary_key = dictionaries.dictionary_key
     ${dictionaryFilter}
     GROUP BY dictionaries.dictionary_key
     ORDER BY dictionaries.is_default DESC, name ASC`,
    [
      ...(translationLanguage ? [translationLanguage] : []),
      displayLanguage,
      ...(dictionaryKey ? [dictionaryKey] : []),
    ],
  );
}

export async function getDictionary(
  dictionaryKey: string,
  displayLanguage = 'en',
): Promise<DictionarySummary | null> {
  const dictionaries = await getDictionaries({ displayLanguage, dictionaryKey });
  return dictionaries[0] ?? null;
}

export async function contentDictionaryExists(dictionaryKey: string): Promise<boolean> {
  const database = await getContentDatabase();
  const row = await database.getFirstAsync<{ dictionary_key: string }>(
    'SELECT dictionary_key FROM dictionaries WHERE dictionary_key = ? LIMIT 1',
    [dictionaryKey],
  );
  return Boolean(row);
}
