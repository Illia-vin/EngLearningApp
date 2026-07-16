import * as SQLite from 'expo-sqlite';
import { seedDictionaries } from './seeds/seeder';

export const db = SQLite.openDatabaseSync('englearning.db');

export async function ensureColumn(table: string, column: string, definition: string) {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  const exists = columns.some((c) => c.name === column);
  if (!exists) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export async function initDatabase() {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS words (
      id TEXT PRIMARY KEY,
      source_word TEXT NOT NULL,
      translation TEXT NOT NULL,
      UNIQUE(source_word)
    );

    CREATE TABLE IF NOT EXISTS word_lists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS word_list_items (
      word_list_id TEXT NOT NULL,
      word_id TEXT NOT NULL,
      PRIMARY KEY (word_list_id, word_id),
      FOREIGN KEY (word_list_id) REFERENCES word_lists(id) ON DELETE CASCADE,
      FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_progress (
      word_id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'learning',
      ease_factor REAL NOT NULL DEFAULT 2.5,
      interval_days INTEGER NOT NULL DEFAULT 0,
      repetitions INTEGER NOT NULL DEFAULT 0,
      next_review_at INTEGER,
      updated_at INTEGER,
      FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
    );
  `);

  try {
    await seedDictionaries();
  } catch (error) {
    console.error('Database initialization failed:', error);
  }
}
