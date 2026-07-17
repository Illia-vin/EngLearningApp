import * as SQLite from 'expo-sqlite';

export const USER_DATABASE_NAME = 'user.db';

interface Migration {
  version: number;
  migrate: (database: SQLite.SQLiteDatabase) => Promise<void>;
}

const migrations: Migration[] = [
  {
    version: 1,
    migrate: async (database) => {
      await database.execAsync(`
        CREATE TABLE settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at INTEGER NOT NULL DEFAULT (unixepoch())
        ) WITHOUT ROWID;

        CREATE TABLE user_progress (
          word TEXT PRIMARY KEY COLLATE NOCASE,
          status TEXT NOT NULL DEFAULT 'learning',
          ease_factor REAL NOT NULL DEFAULT 2.5,
          interval_days INTEGER NOT NULL DEFAULT 0,
          repetitions INTEGER NOT NULL DEFAULT 0,
          next_review_at INTEGER,
          updated_at INTEGER NOT NULL DEFAULT (unixepoch())
        ) WITHOUT ROWID;

        CREATE INDEX user_progress_next_review_at
          ON user_progress(next_review_at);
      `);
    },
  },
  {
    version: 2,
    migrate: async (database) => {
      await database.execAsync(`
        CREATE TABLE dictionary_preferences (
          dictionary_key TEXT PRIMARY KEY,
          is_enabled INTEGER NOT NULL CHECK (is_enabled IN (0, 1)),
          updated_at INTEGER NOT NULL DEFAULT (unixepoch())
        ) WITHOUT ROWID;

        CREATE INDEX user_progress_status_next_review
          ON user_progress(status, next_review_at);
      `);
    },
  },
];

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function migrateUserDatabase(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  const row = await database.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  );
  let currentVersion = row?.user_version ?? 0;
  const latestVersion = migrations.at(-1)?.version ?? 0;

  if (currentVersion > latestVersion) {
    throw new Error(
      `user.db schema ${currentVersion} is newer than supported schema ${latestVersion}`,
    );
  }

  for (const migration of migrations) {
    if (migration.version <= currentVersion) {
      continue;
    }

    await database.withTransactionAsync(async () => {
      await migration.migrate(database);
      await database.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
    currentVersion = migration.version;
  }
}

export function getUserDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = (async () => {
      const database = await SQLite.openDatabaseAsync(USER_DATABASE_NAME);
      await migrateUserDatabase(database);
      return database;
    })();
  }

  return databasePromise;
}
