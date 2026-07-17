import * as SQLite from 'expo-sqlite';

export const USER_DATABASE_NAME = 'user.db';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function ensureUserProgressTable(database: SQLite.SQLiteDatabase) {
  const columns = await database.getAllAsync<{ name: string }>(
    'PRAGMA table_info(user_progress)',
  );

  if (columns.length === 0) {
    await database.execAsync(`
      CREATE TABLE user_progress (
        word TEXT PRIMARY KEY COLLATE NOCASE,
        status TEXT NOT NULL DEFAULT 'learning',
        ease_factor REAL NOT NULL DEFAULT 2.5,
        interval_days INTEGER NOT NULL DEFAULT 0,
        repetitions INTEGER NOT NULL DEFAULT 0,
        difficulty INTEGER NOT NULL DEFAULT 0,
        next_review_at INTEGER,
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      ) WITHOUT ROWID;
    `);
    return;
  }

  const hasWord = columns.some((column) => column.name === 'word');
  const hasEntryKey = columns.some((column) => column.name === 'entry_key');
  if (hasWord) {
    if (!columns.some((column) => column.name === 'difficulty')) {
      await database.execAsync(
        'ALTER TABLE user_progress ADD COLUMN difficulty INTEGER NOT NULL DEFAULT 0',
      );
    }
    return;
  }
  if (!hasEntryKey) {
    throw new Error('Unsupported user_progress structure');
  }

  await database.withTransactionAsync(async () => {
    await database.execAsync(`
      ALTER TABLE user_progress RENAME TO user_progress_entry_key_legacy;

      CREATE TABLE user_progress (
        word TEXT PRIMARY KEY COLLATE NOCASE,
        status TEXT NOT NULL DEFAULT 'learning',
        ease_factor REAL NOT NULL DEFAULT 2.5,
        interval_days INTEGER NOT NULL DEFAULT 0,
        repetitions INTEGER NOT NULL DEFAULT 0,
        difficulty INTEGER NOT NULL DEFAULT 0,
        next_review_at INTEGER,
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      ) WITHOUT ROWID;

      INSERT INTO user_progress (
        word, status, ease_factor, interval_days, repetitions,
        next_review_at, updated_at
      )
      SELECT
        lower(trim(entry_key)), status, ease_factor, interval_days, repetitions,
        next_review_at, updated_at
      FROM user_progress_entry_key_legacy;

      DROP TABLE user_progress_entry_key_legacy;
    `);
  });
}

async function initializeUserDatabase(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    ) WITHOUT ROWID;

    CREATE TABLE IF NOT EXISTS dictionary_preferences (
      dictionary_key TEXT PRIMARY KEY,
      is_enabled INTEGER NOT NULL CHECK (is_enabled IN (0, 1)),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    ) WITHOUT ROWID;
  `);

  await ensureUserProgressTable(database);

  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS user_progress_next_review_at
      ON user_progress(next_review_at);
    CREATE INDEX IF NOT EXISTS user_progress_status_next_review
      ON user_progress(status, next_review_at);

    PRAGMA user_version = 0;
  `);
}

export function getUserDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = (async () => {
      const database = await SQLite.openDatabaseAsync(USER_DATABASE_NAME);
      await initializeUserDatabase(database);
      return database;
    })();
  }

  return databasePromise;
}
