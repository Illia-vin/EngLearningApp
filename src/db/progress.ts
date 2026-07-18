import { getUserDatabase } from './userDatabase';
import { contentWordExists, normalizeEnglishWord } from './words';

export interface UserProgress {
  word: string;
  status: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  difficulty: number;
  next_review_at: number | null;
  updated_at: number;
}

export const MASTERED_REPETITION_COUNT = 5;

export async function getAllWordProgressMap(): Promise<Map<string, UserProgress>> {
  const database = await getUserDatabase();
  const entries = await database.getAllAsync<UserProgress>('SELECT * FROM user_progress');
  return new Map(entries.map((entry) => [entry.word.toLowerCase(), entry]));
}

export async function getWordProgressMap(words: string[]): Promise<Map<string, UserProgress>> {
  if (words.length === 0) {
    return new Map();
  }

  const database = await getUserDatabase();
  const normalizedWords = [...new Set(words.map(normalizeEnglishWord))];
  const placeholders = normalizedWords.map(() => '?').join(', ');
  const entries = await database.getAllAsync<UserProgress>(
    `SELECT * FROM user_progress WHERE word IN (${placeholders})`,
    normalizedWords,
  );

  return new Map(entries.map((entry) => [entry.word.toLowerCase(), entry]));
}

export async function getWordProgress(word: string): Promise<UserProgress | null> {
  const database = await getUserDatabase();
  return database.getFirstAsync<UserProgress>(
    'SELECT * FROM user_progress WHERE word = ? LIMIT 1',
    [normalizeEnglishWord(word)],
  );
}

export async function saveWordProgress(progress: UserProgress) {
  const word = normalizeEnglishWord(progress.word);
  if (!(await contentWordExists(word))) {
    throw new Error(`Cannot save progress for unknown word: ${word}`);
  }

  const database = await getUserDatabase();
  await database.runAsync(
    `INSERT INTO user_progress (
       word, status, ease_factor, interval_days, repetitions,
       difficulty, next_review_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(word) DO UPDATE SET
       status = excluded.status,
       ease_factor = excluded.ease_factor,
       interval_days = excluded.interval_days,
       repetitions = excluded.repetitions,
       difficulty = excluded.difficulty,
       next_review_at = excluded.next_review_at,
       updated_at = excluded.updated_at`,
    [
      word,
      progress.status,
      progress.ease_factor,
      progress.interval_days,
      progress.repetitions,
      progress.difficulty,
      progress.next_review_at,
      progress.updated_at,
    ],
  );
}

export async function resetWordProgress(word: string): Promise<void> {
  const database = await getUserDatabase();
  await database.runAsync('DELETE FROM user_progress WHERE word = ?', [normalizeEnglishWord(word)]);
}
