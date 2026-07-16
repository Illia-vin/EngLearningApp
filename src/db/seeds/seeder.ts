import * as Crypto from 'expo-crypto';
import { db } from '../database';
import { dictionaries, RawWord } from '../dictionaryRegistry';

export async function seedDictionaries() {
  try {
    await db.withTransactionAsync(async () => {
      for (const dict of dictionaries) {
        // Усі запити виконуються через методи об'єкта `db`, але в межах транзакції
        await db.runAsync(
          `INSERT OR IGNORE INTO word_lists (id, name) VALUES (?, ?)`,
          [dict.id, dict.name]
        );

        const rawWords: RawWord[] = dict.loader();

        for (const item of rawWords) {
          const source = item.source_word.trim().toLowerCase();
          const translation = item.translation.trim();

          if (!source || !translation) continue;

          const existing = await db.getFirstAsync<{ id: string }>(
            `SELECT id FROM words WHERE source_word = ? LIMIT 1`,
            [source]
          );

          let wordId: string;

          if (existing) {
            wordId = existing.id;
          } else {
            wordId = Crypto.randomUUID();
            await db.runAsync(
              `INSERT INTO words (id, source_word, translation) VALUES (?, ?, ?)`,
              [wordId, source, translation]
            );
          }

          await db.runAsync(
            `INSERT OR IGNORE INTO word_list_items (word_list_id, word_id) VALUES (?, ?)`,
            [dict.id, wordId]
          );
        }
      }
    });
  } catch (error) {
    throw error;
  }
}
