import { contentDictionaryExists, getDictionaries, type DictionarySummary } from './dictionaryRegistry';
import { getContentDatabase } from './contentDatabase';
import { getUserDatabase } from './userDatabase';
import { ensureDictionaryProgressCounts } from './progress';

export interface DictionarySelection extends DictionarySummary { is_enabled: boolean; studied_word_count: number; progress_percent: number }

export async function getDictionarySelections(displayLanguage = 'en'): Promise<DictionarySelection[]> {
  const [dictionaries, database] = await Promise.all([getDictionaries(displayLanguage), getUserDatabase()]);
  await ensureDictionaryProgressCounts();
  const stored = await database.getAllAsync<{ dictionary_id: number; is_enabled: number }>('SELECT dictionary_id, is_enabled FROM dictionary_preferences');
  const preferences = new Map(stored.map((preference) => [preference.dictionary_id, preference.is_enabled === 1]));
  const missing = dictionaries.filter((dictionary) => !preferences.has(dictionary.id));
  if (missing.length) await database.withTransactionAsync(async () => {
    for (const dictionary of missing) { await database.runAsync('INSERT OR IGNORE INTO dictionary_preferences (dictionary_id, is_enabled, updated_at) VALUES (?, ?, unixepoch())', [dictionary.id, dictionary.id === 1 ? 1 : 0]); preferences.set(dictionary.id, dictionary.id === 1); }
  });
  const storedCounts = await database.getAllAsync<{ dictionary_id: number; studied_word_count: number }>('SELECT dictionary_id, studied_word_count FROM dictionary_progress_counts');
  const counts = new Map(storedCounts.map((count) => [count.dictionary_id, count.studied_word_count]));
  return dictionaries.map((dictionary) => { const studied_word_count = counts.get(dictionary.id) ?? 0; return { ...dictionary, is_enabled: preferences.get(dictionary.id) ?? false, studied_word_count, progress_percent: dictionary.word_count ? Math.round(studied_word_count / dictionary.word_count * 100) : 0 }; });
}
export async function setDictionaryEnabled(dictionaryId: number, enabled: boolean) { if (!(await contentDictionaryExists(dictionaryId))) throw new Error(`Unknown dictionary ID: ${dictionaryId}`); await (await getUserDatabase()).runAsync('INSERT INTO dictionary_preferences (dictionary_id, is_enabled, updated_at) VALUES (?, ?, unixepoch()) ON CONFLICT(dictionary_id) DO UPDATE SET is_enabled=excluded.is_enabled, updated_at=excluded.updated_at', [dictionaryId, enabled ? 1 : 0]); }
export async function getEnabledDictionaryIds() { return (await getDictionarySelections()).filter((dictionary) => dictionary.is_enabled).map((dictionary) => dictionary.id); }
export async function getEnabledDictionaryIdsForStudy() {
  const [content, database] = await Promise.all([getContentDatabase(), getUserDatabase()]);
  const dictionaries = await content.getAllAsync<{ id: number }>('SELECT id FROM dictionaries ORDER BY id');
  const stored = await database.getAllAsync<{ dictionary_id: number; is_enabled: number }>('SELECT dictionary_id, is_enabled FROM dictionary_preferences');
  const preferences = new Map(stored.map((preference) => [preference.dictionary_id, preference.is_enabled === 1]));
  const missing = dictionaries.filter((dictionary) => !preferences.has(dictionary.id));
  if (missing.length) await database.withTransactionAsync(async () => {
    for (const dictionary of missing) {
      const enabled = dictionary.id === 1;
      await database.runAsync('INSERT OR IGNORE INTO dictionary_preferences (dictionary_id, is_enabled, updated_at) VALUES (?, ?, unixepoch())', [dictionary.id, enabled ? 1 : 0]);
      preferences.set(dictionary.id, enabled);
    }
  });
  return dictionaries.filter((dictionary) => preferences.get(dictionary.id)).map((dictionary) => dictionary.id);
}
