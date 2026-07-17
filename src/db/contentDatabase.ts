import * as SQLite from 'expo-sqlite';

export const CONTENT_DATABASE_NAME = 'words.db';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getContentDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = (async () => {
      // Content is replaced from the bundled asset on each cold start. It never
      // contains user data, so app updates can safely ship a new version.
      await SQLite.importDatabaseFromAssetAsync(CONTENT_DATABASE_NAME, {
        assetId: require('../../assets/databases/words.db'),
        forceOverwrite: true,
      });

      const database = await SQLite.openDatabaseAsync(CONTENT_DATABASE_NAME);
      await database.execAsync(`
        PRAGMA foreign_keys = ON;
        PRAGMA query_only = ON;
      `);
      return database;
    })();
  }

  return databasePromise;
}
