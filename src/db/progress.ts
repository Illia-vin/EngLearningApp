import { contentWordExists } from './words';
import { getUserDatabase, migrateLegacyProgress } from './userDatabase';

export interface UserProgress { word_id: number; status: string; ease_factor: number; interval_days: number; repetitions: number; difficulty: number; next_review_at: number | null; updated_at: number }
export const MASTERED_REPETITION_COUNT = 5;

async function databaseWithMigratedProgress() {
  const database = await getUserDatabase();
  await migrateLegacyProgress(database);
  return database;
}
export async function getAllWordProgressMap() { const entries = await (await databaseWithMigratedProgress()).getAllAsync<UserProgress>('SELECT * FROM user_progress'); return new Map(entries.map((entry) => [entry.word_id, entry])); }
export async function getWordProgressMap(wordIds: number[]) { if (!wordIds.length) return new Map(); const database = await databaseWithMigratedProgress(); const ids = [...new Set(wordIds)]; const entries = await database.getAllAsync<UserProgress>(`SELECT * FROM user_progress WHERE word_id IN (${ids.map(() => '?').join(', ')})`, ids); return new Map(entries.map((entry) => [entry.word_id, entry])); }
export async function getWordProgress(wordId: number) { return (await databaseWithMigratedProgress()).getFirstAsync<UserProgress>('SELECT * FROM user_progress WHERE word_id = ? LIMIT 1', [wordId]); }
export async function saveWordProgress(progress: UserProgress) { if (!(await contentWordExists(progress.word_id))) throw new Error(`Cannot save progress for unknown word ID: ${progress.word_id}`); const database = await databaseWithMigratedProgress(); await database.runAsync(`INSERT INTO user_progress (word_id,status,ease_factor,interval_days,repetitions,difficulty,next_review_at,updated_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(word_id) DO UPDATE SET status=excluded.status,ease_factor=excluded.ease_factor,interval_days=excluded.interval_days,repetitions=excluded.repetitions,difficulty=excluded.difficulty,next_review_at=excluded.next_review_at,updated_at=excluded.updated_at`, [progress.word_id,progress.status,progress.ease_factor,progress.interval_days,progress.repetitions,progress.difficulty,progress.next_review_at,progress.updated_at]); }
export async function resetWordProgress(wordId: number) { await (await databaseWithMigratedProgress()).runAsync('DELETE FROM user_progress WHERE word_id = ?', [wordId]); }
