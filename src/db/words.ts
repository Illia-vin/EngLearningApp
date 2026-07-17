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

async function assertTranslationLanguage(language: string) {
  if (!/^[a-z][a-z0-9_]*$/.test(language)) {
    throw new Error(`Translation language is not available: ${language}`);
  }

  const database = await getContentDatabase();
  const available = await database.getFirstAsync<{ language: string }>(
    'SELECT language FROM translations WHERE language = ? LIMIT 1',
    [language],
  );
  if (!available) {
    throw new Error(`Translation language is not available: ${language}`);
  }
}

export async function getWordsForDictionaries(
  dictionaryKeys: string[],
  language = DEFAULT_TRANSLATION_LANGUAGE,
): Promise<DictionaryWord[]> {
  if (dictionaryKeys.length === 0) {
    return [];
  }

  await assertTranslationLanguage(language);
  const database = await getContentDatabase();
  const placeholders = dictionaryKeys.map(() => '?').join(', ');

  return database.getAllAsync<DictionaryWord>(
    `WITH selected_words AS (
       SELECT DISTINCT word
       FROM dictionary_items
       WHERE dictionary_key IN (${placeholders})
     ), ordered_translations AS (
       SELECT word, translation
       FROM translations
       WHERE language = ?
       ORDER BY word COLLATE NOCASE, position
     )
     SELECT
       selected_words.word,
       GROUP_CONCAT(ordered_translations.translation, ', ') AS translation
     FROM selected_words
     INNER JOIN ordered_translations
       ON ordered_translations.word = selected_words.word
     GROUP BY selected_words.word
     ORDER BY selected_words.word COLLATE NOCASE ASC`,
    [...dictionaryKeys, language],
  );
}

export async function getDictionaryWords(
  dictionaryKey: string,
  language = DEFAULT_TRANSLATION_LANGUAGE,
): Promise<DictionaryWord[]> {
  return getWordsForDictionaries([dictionaryKey], language);
}

export async function getDefaultDictionaryWords(
  language = DEFAULT_TRANSLATION_LANGUAGE,
): Promise<DictionaryWord[]> {
  await assertTranslationLanguage(language);
  const database = await getContentDatabase();

  return database.getAllAsync<DictionaryWord>(
    `WITH selected_words AS (
       SELECT dictionary_items.word
       FROM dictionaries
       INNER JOIN dictionary_items
         ON dictionary_items.dictionary_key = dictionaries.dictionary_key
       WHERE dictionaries.is_default = 1
     ), ordered_translations AS (
       SELECT word, translation
       FROM translations
       WHERE language = ?
       ORDER BY word COLLATE NOCASE, position
     )
     SELECT
       selected_words.word,
       GROUP_CONCAT(ordered_translations.translation, ', ') AS translation
     FROM selected_words
     INNER JOIN ordered_translations
       ON ordered_translations.word = selected_words.word
     GROUP BY selected_words.word
     ORDER BY selected_words.word COLLATE NOCASE ASC`,
    [language],
  );
}
