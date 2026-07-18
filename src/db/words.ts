import { getContentDatabase } from './contentDatabase';

export interface DictionaryWord {
  id: number;
  word: string;
  type: string;
  cefr: string;
  phon_br: string;
  phon_n_am: string;
  definition: string;
  example: string;
  translation_uk: string;
  translation_es: string;
  translation: string;
  uk: string;
  us: string;
}

export interface DictionaryWordsPage { limit?: number; offset?: number }
export interface WordReference { id: number; word: string }

function decodeWordPhonetics(word: DictionaryWord): DictionaryWord {
  return {
    ...word,
    phon_br: decodeURIComponent(word.phon_br),
    phon_n_am: decodeURIComponent(word.phon_n_am),
  };
}

export async function contentWordExists(wordId: number): Promise<boolean> {
  const database = await getContentDatabase();
  return Boolean(await database.getFirstAsync<{ id: number }>('SELECT id FROM words WHERE id = ? LIMIT 1', [wordId]));
}

export async function getWordReferencesForDictionaries(dictionaryIds: number[]): Promise<WordReference[]> {
  if (dictionaryIds.length === 0) return [];
  const database = await getContentDatabase();
  const placeholders = dictionaryIds.map(() => '?').join(', ');
  return database.getAllAsync<WordReference>(
    `SELECT DISTINCT words.id, words.word FROM words
     INNER JOIN dictionary_words ON dictionary_words.word_id = words.id
     WHERE dictionary_words.dictionary_id IN (${placeholders})
     ORDER BY words.word COLLATE NOCASE, words.id`,
    dictionaryIds,
  );
}

function pagination(page?: DictionaryWordsPage) {
  const offset = page?.offset ?? 0;
  if (page?.limit !== undefined) return { sql: 'LIMIT ? OFFSET ?', values: [page.limit, offset] };
  return offset > 0 ? { sql: 'LIMIT -1 OFFSET ?', values: [offset] } : { sql: '', values: [] };
}

export async function getWordsForDictionaries(
  dictionaryIds: number[],
  language: 'uk' | 'es' = 'uk',
  displayLanguage: 'uk' | 'en' | 'es' = 'en',
  page?: DictionaryWordsPage,
): Promise<DictionaryWord[]> {
  if (dictionaryIds.length === 0) return [];
  const database = await getContentDatabase();
  const placeholders = dictionaryIds.map(() => '?').join(', ');
  const pageQuery = pagination(page);
  const words = await database.getAllAsync<DictionaryWord>(
    `SELECT DISTINCT words.*, COALESCE(word_type_names.name, word_types.code) AS type,
       CASE ? WHEN 'es' THEN words.translation_es ELSE words.translation_uk END AS translation
     FROM words
     INNER JOIN dictionary_words ON dictionary_words.word_id = words.id
     INNER JOIN word_types ON word_types.id = words.type_id
     LEFT JOIN word_type_names ON word_type_names.type_id = word_types.id AND word_type_names.language = ?
     WHERE dictionary_words.dictionary_id IN (${placeholders})
     ORDER BY words.word COLLATE NOCASE, words.id ${pageQuery.sql}`,
    [language, displayLanguage, ...dictionaryIds, ...pageQuery.values],
  );
  return words.map(decodeWordPhonetics);
}

export function getDictionaryWords(
  dictionaryId: number,
  language: 'uk' | 'es' = 'uk',
  displayLanguage: 'uk' | 'en' | 'es' = 'en',
  page?: DictionaryWordsPage,
) {
  return getWordsForDictionaries([dictionaryId], language, displayLanguage, page);
}

export async function getWord(
  wordId: number,
  language: 'uk' | 'es' = 'uk',
  displayLanguage: 'uk' | 'en' | 'es' = 'en',
): Promise<DictionaryWord | null> {
  const database = await getContentDatabase();
  const word = await database.getFirstAsync<DictionaryWord>(
    `SELECT words.*, COALESCE(word_type_names.name, word_types.code) AS type,
       CASE ? WHEN 'es' THEN words.translation_es ELSE words.translation_uk END AS translation
     FROM words
     INNER JOIN word_types ON word_types.id = words.type_id
     LEFT JOIN word_type_names ON word_type_names.type_id = word_types.id AND word_type_names.language = ?
     WHERE words.id = ? LIMIT 1`, [language, displayLanguage, wordId],
  );
  return word ? decodeWordPhonetics(word) : null;
}
