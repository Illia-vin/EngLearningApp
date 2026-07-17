import { getContentDatabase } from './contentDatabase';

export interface DictionarySummary {
  dictionary_key: string;
  name: string;
  is_default: number;
  translation_languages: string;
  word_count: number;
  list_count: number;
}

export interface WordListSummary {
  list_key: string;
  dictionary_key: string;
  name: string;
  word_count: number;
}

export async function getDictionaries(
  interfaceLanguage = 'en',
): Promise<DictionarySummary[]> {
  const database = await getContentDatabase();
  return database.getAllAsync<DictionarySummary>(
    `SELECT
       dictionaries.dictionary_key,
       COALESCE(localized_name.name, english_name.name, dictionaries.dictionary_key) AS name,
       dictionaries.is_default,
       GROUP_CONCAT(DISTINCT dictionary_languages.language) AS translation_languages,
       COUNT(DISTINCT word_list_items.word) AS word_count,
       COUNT(DISTINCT word_lists.list_key) AS list_count
     FROM dictionaries
     LEFT JOIN dictionary_names AS localized_name
       ON localized_name.dictionary_key = dictionaries.dictionary_key
      AND localized_name.language = ?
     LEFT JOIN dictionary_names AS english_name
       ON english_name.dictionary_key = dictionaries.dictionary_key
      AND english_name.language = 'en'
     LEFT JOIN dictionary_languages
       ON dictionary_languages.dictionary_key = dictionaries.dictionary_key
     LEFT JOIN word_lists
       ON word_lists.dictionary_key = dictionaries.dictionary_key
     LEFT JOIN word_list_items
       ON word_list_items.list_key = word_lists.list_key
     GROUP BY dictionaries.dictionary_key
     ORDER BY dictionaries.is_default DESC, name ASC`,
    [interfaceLanguage],
  );
}

export async function contentDictionaryExists(dictionaryKey: string): Promise<boolean> {
  const database = await getContentDatabase();
  const row = await database.getFirstAsync<{ dictionary_key: string }>(
    'SELECT dictionary_key FROM dictionaries WHERE dictionary_key = ? LIMIT 1',
    [dictionaryKey],
  );
  return Boolean(row);
}

export async function getWordLists(
  dictionaryKey?: string,
  interfaceLanguage = 'en',
): Promise<WordListSummary[]> {
  const database = await getContentDatabase();
  return database.getAllAsync<WordListSummary>(
    `SELECT
       word_lists.list_key,
       word_lists.dictionary_key,
       COALESCE(localized_name.name, english_name.name, word_lists.list_key) AS name,
       COUNT(word_list_items.word) AS word_count
     FROM word_lists
     LEFT JOIN word_list_names AS localized_name
       ON localized_name.list_key = word_lists.list_key
      AND localized_name.language = ?
     LEFT JOIN word_list_names AS english_name
       ON english_name.list_key = word_lists.list_key
      AND english_name.language = 'en'
     LEFT JOIN word_list_items
       ON word_list_items.list_key = word_lists.list_key
     WHERE (? IS NULL OR word_lists.dictionary_key = ?)
     GROUP BY word_lists.list_key
     ORDER BY name ASC`,
    [interfaceLanguage, dictionaryKey ?? null, dictionaryKey ?? null],
  );
}
