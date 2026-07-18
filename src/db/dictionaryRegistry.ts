import { getContentDatabase } from './contentDatabase';

export interface DictionarySummary { id: number; cefr: string; name: string; word_count: number }

export async function getDictionaries(displayLanguage = 'en'): Promise<DictionarySummary[]> {
  const database = await getContentDatabase();
  return database.getAllAsync<DictionarySummary>(
    `SELECT dictionaries.id, dictionaries.cefr, dictionaries.word_count,
       COALESCE(localized.name, english.name, dictionaries.cefr) AS name
     FROM dictionaries
     LEFT JOIN dictionary_names AS localized ON localized.dictionary_id = dictionaries.id AND localized.language = ?
     LEFT JOIN dictionary_names AS english ON english.dictionary_id = dictionaries.id AND english.language = 'en'
     ORDER BY dictionaries.id`, [displayLanguage]);
}

export async function getDictionary(id: number, displayLanguage = 'en'): Promise<DictionarySummary | null> {
  return (await getDictionaries(displayLanguage)).find((dictionary) => dictionary.id === id) ?? null;
}

export async function contentDictionaryExists(id: number): Promise<boolean> {
  const database = await getContentDatabase();
  return Boolean(await database.getFirstAsync<{ id: number }>('SELECT id FROM dictionaries WHERE id = ? LIMIT 1', [id]));
}
