import * as SQLite from 'expo-sqlite';
import { getContentDatabase } from './contentDatabase';

export const USER_DATABASE_NAME = 'user.db';
let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function ensureUserProgressTable(database: SQLite.SQLiteDatabase) {
  const columns = await database.getAllAsync<{ name: string }>('PRAGMA table_info(user_progress)');
  if (columns.length === 0) {
    await database.execAsync(`CREATE TABLE user_progress (
      word_id INTEGER PRIMARY KEY, status TEXT NOT NULL DEFAULT 'learning',
      ease_factor REAL NOT NULL DEFAULT 2.5, interval_days INTEGER NOT NULL DEFAULT 0,
      repetitions INTEGER NOT NULL DEFAULT 0, difficulty INTEGER NOT NULL DEFAULT 0,
      next_review_at INTEGER, updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    ) WITHOUT ROWID;`);
    return;
  }
  if (columns.some((column) => column.name === 'word_id')) return;
  if (!columns.some((column) => column.name === 'word')) throw new Error('Unsupported user_progress structure');
  await database.execAsync('ALTER TABLE user_progress RENAME TO user_progress_word_legacy');
  await ensureUserProgressTable(database);
}

export async function migrateLegacyProgress(database: SQLite.SQLiteDatabase): Promise<void> {
  const legacy = await database.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'user_progress_word_legacy'",
  );
  if (!legacy) return;
  const content = await getContentDatabase();
  const oldProgress = await database.getAllAsync<{
    word: string; status: string; ease_factor: number; interval_days: number; repetitions: number;
    difficulty?: number; next_review_at: number | null; updated_at: number;
  }>('SELECT * FROM user_progress_word_legacy');
  await database.withTransactionAsync(async () => {
    for (const progress of oldProgress) {
      const matches = await content.getAllAsync<{ id: number }>(
        'SELECT id FROM words WHERE word = ? COLLATE NOCASE', [progress.word.trim()],
      );
      for (const match of matches) {
        await database.runAsync(`INSERT OR REPLACE INTO user_progress
          (word_id, status, ease_factor, interval_days, repetitions, difficulty, next_review_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
          match.id, progress.status, progress.ease_factor, progress.interval_days, progress.repetitions,
          progress.difficulty ?? 0, progress.next_review_at, progress.updated_at,
        ]);
      }
    }
    await database.execAsync('DROP TABLE user_progress_word_legacy');
  });
}

async function initializeUserDatabase(database: SQLite.SQLiteDatabase) {
  const preferenceColumns = await database.getAllAsync<{ name: string }>('PRAGMA table_info(dictionary_preferences)');
  if (preferenceColumns.some((column) => column.name === 'dictionary_key')) {
    await database.execAsync('DROP TABLE dictionary_preferences');
  }
  await database.execAsync(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS dictionary_preferences (
      dictionary_id INTEGER PRIMARY KEY, is_enabled INTEGER NOT NULL CHECK (is_enabled IN (0, 1)),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    ) WITHOUT ROWID;`);
  await ensureUserProgressTable(database);
  await database.execAsync(`CREATE INDEX IF NOT EXISTS user_progress_next_review_at ON user_progress(next_review_at);
    CREATE INDEX IF NOT EXISTS user_progress_status_next_review ON user_progress(status, next_review_at); PRAGMA user_version = 1;`);
}

export function getUserDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) databasePromise = (async () => {
    const database = await SQLite.openDatabaseAsync(USER_DATABASE_NAME);
    await initializeUserDatabase(database);
    await migrateLegacyProgress(database);
    return database;
  })();
  return databasePromise;
}
