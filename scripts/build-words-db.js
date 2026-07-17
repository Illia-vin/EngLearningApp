const { existsSync, mkdirSync, readFileSync, rmSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const projectRoot = resolve(__dirname, '..');
const seedsDirectory = join(projectRoot, 'src', 'db', 'seeds');
const outputDirectory = join(projectRoot, 'assets', 'databases');
const outputPath = join(outputDirectory, 'words.db');
const manifest = JSON.parse(
  readFileSync(join(seedsDirectory, 'dictionaries.json'), 'utf8'),
);

function validateLocalizedNames(owner, names) {
  if (!names || typeof names !== 'object' || Array.isArray(names)) {
    throw new Error(`${owner} name must be an object keyed by interface language`);
  }

  if (typeof names.en !== 'string' || !names.en.trim()) {
    throw new Error(`${owner} must have a non-empty English name fallback`);
  }
}

if (manifest.filter((dictionary) => dictionary.is_default).length !== 1) {
  throw new Error('Exactly one dictionary must have is_default=true');
}

const translationLanguages = [
  ...new Set(
    manifest.flatMap((dictionary) =>
      dictionary.lists.flatMap((list) =>
        Object.values(list.words).flatMap((translations) =>
          Object.keys(translations),
        ),
      ),
    ),
  ),
].sort();

if (translationLanguages.length === 0) {
  throw new Error('At least one translation language is required');
}

for (const language of translationLanguages) {
  if (typeof language !== 'string' || !/^[a-z][a-z0-9_]*$/.test(language)) {
    throw new Error(`Invalid translation language column: ${language}`);
  }
}

const translationColumns = translationLanguages
  .map((language) => `"${language}" TEXT`)
  .join(',\n      ');

mkdirSync(outputDirectory, { recursive: true });
if (existsSync(outputPath)) {
  rmSync(outputPath);
}

const db = new DatabaseSync(outputPath);

try {
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = DELETE;
    PRAGMA user_version = 4;

    CREATE TABLE dictionaries (
      dictionary_key TEXT PRIMARY KEY,
      is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1))
    ) WITHOUT ROWID;

    CREATE UNIQUE INDEX one_default_dictionary
      ON dictionaries(is_default)
      WHERE is_default = 1;

    CREATE TABLE dictionary_names (
      dictionary_key TEXT NOT NULL,
      language TEXT NOT NULL,
      name TEXT NOT NULL,
      PRIMARY KEY (dictionary_key, language),
      FOREIGN KEY (dictionary_key) REFERENCES dictionaries(dictionary_key) ON DELETE CASCADE
    ) WITHOUT ROWID;

    CREATE TABLE dictionary_languages (
      dictionary_key TEXT NOT NULL,
      language TEXT NOT NULL,
      PRIMARY KEY (dictionary_key, language),
      FOREIGN KEY (dictionary_key) REFERENCES dictionaries(dictionary_key) ON DELETE CASCADE
    ) WITHOUT ROWID;

    CREATE TABLE words (
      word TEXT PRIMARY KEY COLLATE NOCASE
    ) WITHOUT ROWID;

    CREATE TABLE translations (
      word TEXT NOT NULL COLLATE NOCASE,
      ${translationColumns},
      PRIMARY KEY (word),
      FOREIGN KEY (word) REFERENCES words(word) ON DELETE CASCADE
    ) WITHOUT ROWID;

    CREATE TABLE word_lists (
      list_key TEXT PRIMARY KEY,
      dictionary_key TEXT NOT NULL,
      FOREIGN KEY (dictionary_key) REFERENCES dictionaries(dictionary_key) ON DELETE CASCADE
    ) WITHOUT ROWID;

    CREATE TABLE word_list_names (
      list_key TEXT NOT NULL,
      language TEXT NOT NULL,
      name TEXT NOT NULL,
      PRIMARY KEY (list_key, language),
      FOREIGN KEY (list_key) REFERENCES word_lists(list_key) ON DELETE CASCADE
    ) WITHOUT ROWID;

    CREATE INDEX word_lists_dictionary_key
      ON word_lists(dictionary_key);

    CREATE TABLE word_list_items (
      list_key TEXT NOT NULL,
      word TEXT NOT NULL COLLATE NOCASE,
      position INTEGER NOT NULL,
      PRIMARY KEY (list_key, word),
      UNIQUE (list_key, position),
      FOREIGN KEY (list_key) REFERENCES word_lists(list_key) ON DELETE CASCADE,
      FOREIGN KEY (word) REFERENCES words(word) ON DELETE CASCADE
    ) WITHOUT ROWID;

  `);

  const insertDictionary = db.prepare(`
    INSERT INTO dictionaries (dictionary_key, is_default)
    VALUES (?, ?)
  `);
  const insertDictionaryName = db.prepare(`
    INSERT INTO dictionary_names (dictionary_key, language, name)
    VALUES (?, ?, ?)
  `);
  const insertDictionaryLanguage = db.prepare(`
    INSERT OR IGNORE INTO dictionary_languages (dictionary_key, language)
    VALUES (?, ?)
  `);
  const insertList = db.prepare(`
    INSERT INTO word_lists (list_key, dictionary_key)
    VALUES (?, ?)
  `);
  const insertListName = db.prepare(`
    INSERT INTO word_list_names (list_key, language, name)
    VALUES (?, ?, ?)
  `);
  const insertWord = db.prepare(`
    INSERT OR IGNORE INTO words (word) VALUES (?)
  `);
  const insertTranslationRow = db.prepare(`
    INSERT OR IGNORE INTO translations (word) VALUES (?)
  `);
  const getTranslationByLanguage = Object.fromEntries(
    translationLanguages.map((language) => [
      language,
      db.prepare(`
        SELECT "${language}" AS translation
        FROM translations
        WHERE word = ?
      `),
    ]),
  );
  const updateTranslationByLanguage = Object.fromEntries(
    translationLanguages.map((language) => [
      language,
      db.prepare(`
        UPDATE translations SET "${language}" = ? WHERE word = ?
      `),
    ]),
  );
  const insertListItem = db.prepare(`
    INSERT INTO word_list_items (list_key, word, position)
    VALUES (?, ?, ?)
  `);

  db.exec('BEGIN IMMEDIATE');

  for (const dictionary of manifest) {
    validateLocalizedNames(dictionary.dictionary_key, dictionary.name);
    insertDictionary.run(
      dictionary.dictionary_key,
      dictionary.is_default ? 1 : 0,
    );

    for (const [language, rawName] of Object.entries(dictionary.name)) {
      const name = String(rawName ?? '').trim();
      if (!/^[a-z][a-z0-9_]*$/.test(language) || !name) {
        throw new Error(`Invalid ${language} name for ${dictionary.dictionary_key}`);
      }
      insertDictionaryName.run(dictionary.dictionary_key, language, name);
    }

    for (const list of dictionary.lists) {
      validateLocalizedNames(list.list_key, list.name);
      insertList.run(list.list_key, dictionary.dictionary_key);

      for (const [language, rawName] of Object.entries(list.name)) {
        const name = String(rawName ?? '').trim();
        if (!/^[a-z][a-z0-9_]*$/.test(language) || !name) {
          throw new Error(`Invalid ${language} name for ${list.list_key}`);
        }
        insertListName.run(list.list_key, language, name);
      }

      Object.entries(list.words).forEach(([englishWord, translations], position) => {
        const word = englishWord.trim().toLowerCase();
        const entries = Object.entries(translations);

        if (!word || entries.length === 0) {
          throw new Error(`Invalid word in list ${list.list_key}: ${englishWord}`);
        }

        insertWord.run(word);
        insertTranslationRow.run(word);

        for (const [language, rawTranslation] of entries) {
          if (!translationLanguages.includes(language)) {
            throw new Error(`Unsupported translation language: ${language}`);
          }

          const translation = String(rawTranslation ?? '').trim();
          if (!translation) {
            throw new Error(`Empty ${language} translation for "${word}"`);
          }

          const getTranslation = getTranslationByLanguage[language];
          const updateTranslation = updateTranslationByLanguage[language];
          const storedEntry = getTranslation.get(word);
          if (storedEntry.translation && storedEntry.translation !== translation) {
            throw new Error(
              `Conflicting ${language} translations for "${word}"`,
            );
          }

          updateTranslation.run(translation, word);
          insertDictionaryLanguage.run(dictionary.dictionary_key, language);
        }

        insertListItem.run(list.list_key, word, position);
      });
    }
  }

  db.exec('COMMIT');

  const integrity = db.prepare('PRAGMA integrity_check').get();
  if (integrity.integrity_check !== 'ok') {
    throw new Error(`SQLite integrity check failed: ${integrity.integrity_check}`);
  }

  const foreignKeyErrors = db.prepare('PRAGMA foreign_key_check').all();
  if (foreignKeyErrors.length > 0) {
    throw new Error(`SQLite foreign key check failed: ${JSON.stringify(foreignKeyErrors)}`);
  }

  const wordColumns = db.prepare('PRAGMA table_info(words)').all();
  if (wordColumns.length !== 1 || wordColumns[0].name !== 'word' || wordColumns[0].pk !== 1) {
    throw new Error('words must use the English word as its only primary key');
  }

  const storedTranslationColumns = db
    .prepare('PRAGMA table_info(translations)')
    .all()
    .map((column) => column.name);
  const expectedTranslationColumns = ['word', ...translationLanguages];
  if (storedTranslationColumns.join(',') !== expectedTranslationColumns.join(',')) {
    throw new Error(
      `Unexpected translations columns: ${storedTranslationColumns.join(', ')}`,
    );
  }

  db.exec('VACUUM');
} catch (error) {
  try {
    db.exec('ROLLBACK');
  } catch {
    // There may be no active transaction.
  }
  throw error;
} finally {
  db.close();
}

console.log(`Created ${outputPath}`);
