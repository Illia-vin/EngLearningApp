import { getContentDatabase } from './contentDatabase';

export interface DictionaryWord {
  word: string;
  translation: string;
}

export const DEFAULT_TRANSLATION_LANGUAGE = 'uk';

export function normalizeEnglishWord(word: string) {
  return word.trim().toLowerCase();
}

export async function contentWordExists(word: string): Promise<boolean> {
  const database = await getContentDatabase();
  const row = await database.getFirstAsync<{ word: string }>(
    'SELECT word FROM words WHERE word = ? LIMIT 1',
    [normalizeEnglishWord(word)],
  );
  return Boolean(row);
}

export async function getDefaultDictionaryWords(
  language = DEFAULT_TRANSLATION_LANGUAGE,
): Promise<DictionaryWord[]> {
  const database = await getContentDatabase();
  const translationColumns = await database.getAllAsync<{ name: string }>(
    'PRAGMA table_info(translations)',
  );

  if (
    language === 'word' ||
    !translationColumns.some((column) => column.name === language)
  ) {
    throw new Error(`Translation language is not available: ${language}`);
  }

  return database.getAllAsync<DictionaryWord>(
    `SELECT DISTINCT
       words.word,
       translations."${language}" AS translation
     FROM dictionaries
     INNER JOIN dictionary_languages
       ON dictionary_languages.dictionary_key = dictionaries.dictionary_key
      AND dictionary_languages.language = ?
     INNER JOIN word_lists
       ON word_lists.dictionary_key = dictionaries.dictionary_key
     INNER JOIN word_list_items
       ON word_list_items.list_key = word_lists.list_key
     INNER JOIN words
       ON words.word = word_list_items.word
     INNER JOIN translations
       ON translations.word = words.word
     WHERE dictionaries.is_default = 1
       AND translations."${language}" IS NOT NULL
     ORDER BY words.word ASC`,
    [language],
  );
}
