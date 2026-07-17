import * as SQLite from 'expo-sqlite';

export const CONTENT_DATABASE_NAME = 'words.db';
const CONTENT_DATABASE_VERSION = 6;

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getContentDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = (async () => {
      // The content database never contains user data. Remove the installed
      // copy first so a stale database cannot survive an app update or asset
      // cache; user settings and progress live separately in user.db.
      await SQLite.deleteDatabaseAsync(CONTENT_DATABASE_NAME);
      await SQLite.importDatabaseFromAssetAsync(CONTENT_DATABASE_NAME, {
        assetId: require('../../assets/databases/words.db'),
      });

      const database = await SQLite.openDatabaseAsync(CONTENT_DATABASE_NAME);
      const schema = await database.getFirstAsync<{ user_version: number }>(
        'PRAGMA user_version',
      );
      if (schema?.user_version !== CONTENT_DATABASE_VERSION) {
        await database.closeAsync();
        throw new Error(
          `Invalid words.db schema: expected ${CONTENT_DATABASE_VERSION}, ` +
            `received ${schema?.user_version ?? 'unknown'}`,
        );
      }
      await database.execAsync(`
        PRAGMA foreign_keys = ON;
        PRAGMA query_only = ON;
      `);
      return database;
    })();
  }

  return databasePromise;
}
