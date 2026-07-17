import { getUserDatabase } from './userDatabase';
import { contentWordExists, normalizeEnglishWord } from './words';

export interface UserProgress {
  word: string;
  status: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_at: number | null;
  updated_at: number;
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
       next_review_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(word) DO UPDATE SET
       status = excluded.status,
       ease_factor = excluded.ease_factor,
       interval_days = excluded.interval_days,
       repetitions = excluded.repetitions,
       next_review_at = excluded.next_review_at,
       updated_at = excluded.updated_at`,
    [
      word,
      progress.status,
      progress.ease_factor,
      progress.interval_days,
      progress.repetitions,
      progress.next_review_at,
      progress.updated_at,
    ],
  );
}
