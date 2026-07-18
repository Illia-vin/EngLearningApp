import { contentWordExists, getDictionaryIdsForWord } from './words';
import { getUserDatabase, migrateLegacyProgress } from './userDatabase';

export interface UserProgress { word_id: number; status: string; ease_factor: number; interval_days: number; repetitions: number; difficulty: number; next_review_at: number | null; updated_at: number }
export const MASTERED_REPETITION_COUNT = 5;
const DICTIONARY_COUNTS_READY_KEY = 'dictionary_progress_counts_ready';
let dictionaryCountsPromise: Promise<void> | null = null;

async function databaseWithMigratedProgress() {
  const database = await getUserDatabase();
  await migrateLegacyProgress(database);
  return database;
}

export async function ensureDictionaryProgressCounts(): Promise<void> {
  if (!dictionaryCountsPromise) dictionaryCountsPromise = (async () => {
    const database = await databaseWithMigratedProgress();
    const ready = await database.getFirstAsync<{ value: string }>(
      'SELECT value FROM settings WHERE key = ? LIMIT 1', [DICTIONARY_COUNTS_READY_KEY],
    );
    if (ready?.value === '1') return;

    const studied = await database.getAllAsync<{ word_id: number }>('SELECT word_id FROM user_progress');
    await database.withTransactionAsync(async () => {
      await database.execAsync('DELETE FROM dictionary_progress_counts');
      if (studied.length > 0) {
        const content = await import('./contentDatabase').then(({ getContentDatabase }) => getContentDatabase());
        const relations = await content.getAllAsync<{ dictionary_id: number; word_id: number }>('SELECT dictionary_id, word_id FROM dictionary_words');
        const studiedIds = new Set(studied.map((entry) => entry.word_id));
        const counts = new Map<number, number>();
        relations.forEach((relation) => {
          if (studiedIds.has(relation.word_id)) counts.set(relation.dictionary_id, (counts.get(relation.dictionary_id) ?? 0) + 1);
        });
        for (const [dictionaryId, count] of counts) {
          await database.runAsync('INSERT INTO dictionary_progress_counts (dictionary_id, studied_word_count) VALUES (?, ?)', [dictionaryId, count]);
        }
      }
      await database.runAsync(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, '1', unixepoch())
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [DICTIONARY_COUNTS_READY_KEY],
      );
    });
  })().catch((error) => {
    dictionaryCountsPromise = null;
    throw error;
  });
  return dictionaryCountsPromise;
}

async function updateDictionaryProgressCounts(wordId: number, delta: 1 | -1) {
  const [database, dictionaryIds] = await Promise.all([databaseWithMigratedProgress(), getDictionaryIdsForWord(wordId)]);
  await database.withTransactionAsync(async () => {
    for (const dictionaryId of dictionaryIds) {
      await database.runAsync(
        `INSERT INTO dictionary_progress_counts (dictionary_id, studied_word_count) VALUES (?, ?)
         ON CONFLICT(dictionary_id) DO UPDATE SET studied_word_count = MAX(0, studied_word_count + excluded.studied_word_count)`,
        [dictionaryId, delta],
      );
    }
  });
}
export async function getAllWordProgressMap() { const entries = await (await databaseWithMigratedProgress()).getAllAsync<UserProgress>('SELECT * FROM user_progress'); return new Map(entries.map((entry) => [entry.word_id, entry])); }
export async function getWordProgressMap(wordIds: number[]) { if (!wordIds.length) return new Map(); const database = await databaseWithMigratedProgress(); const ids = [...new Set(wordIds)]; const entries = await database.getAllAsync<UserProgress>(`SELECT * FROM user_progress WHERE word_id IN (${ids.map(() => '?').join(', ')})`, ids); return new Map(entries.map((entry) => [entry.word_id, entry])); }
export async function getWordProgress(wordId: number) { return (await databaseWithMigratedProgress()).getFirstAsync<UserProgress>('SELECT * FROM user_progress WHERE word_id = ? LIMIT 1', [wordId]); }
export async function saveWordProgress(progress: UserProgress) {
  if (!(await contentWordExists(progress.word_id))) throw new Error(`Cannot save progress for unknown word ID: ${progress.word_id}`);
  await ensureDictionaryProgressCounts();
  const database = await databaseWithMigratedProgress();
  const existing = await database.getFirstAsync<{ word_id: number }>('SELECT word_id FROM user_progress WHERE word_id = ? LIMIT 1', [progress.word_id]);
  await database.runAsync(`INSERT INTO user_progress (word_id,status,ease_factor,interval_days,repetitions,difficulty,next_review_at,updated_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(word_id) DO UPDATE SET status=excluded.status,ease_factor=excluded.ease_factor,interval_days=excluded.interval_days,repetitions=excluded.repetitions,difficulty=excluded.difficulty,next_review_at=excluded.next_review_at,updated_at=excluded.updated_at`, [progress.word_id,progress.status,progress.ease_factor,progress.interval_days,progress.repetitions,progress.difficulty,progress.next_review_at,progress.updated_at]);
  if (!existing) await updateDictionaryProgressCounts(progress.word_id, 1);
}
export async function resetWordProgress(wordId: number) {
  await ensureDictionaryProgressCounts();
  const database = await databaseWithMigratedProgress();
  const existing = await database.getFirstAsync<{ word_id: number }>('SELECT word_id FROM user_progress WHERE word_id = ? LIMIT 1', [wordId]);
  if (!existing) return;
  await database.runAsync('DELETE FROM user_progress WHERE word_id = ?', [wordId]);
  await updateDictionaryProgressCounts(wordId, -1);
}
