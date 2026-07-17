const {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
} = require('node:fs');
const { join, resolve } = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const projectRoot = resolve(__dirname, '..');
const seedsDirectory = join(projectRoot, 'src', 'db', 'seeds');
const dictionariesDirectory = join(seedsDirectory, 'dictionaries');
const outputDirectory = join(projectRoot, 'assets', 'databases');
const outputPath = join(outputDirectory, 'words.db');
const dictionarySeedFiles = readdirSync(dictionariesDirectory, {
  withFileTypes: true,
})
  .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
  .map((entry) => entry.name)
  .sort();

if (dictionarySeedFiles.length === 0) {
  throw new Error(`No dictionary seeds found in ${dictionariesDirectory}`);
}

const manifest = dictionarySeedFiles.map((fileName) => {
  const dictionary = JSON.parse(
    readFileSync(join(dictionariesDirectory, fileName), 'utf8'),
  );

  if (!dictionary || typeof dictionary !== 'object' || Array.isArray(dictionary)) {
    throw new Error(`${fileName} must contain exactly one dictionary object`);
  }
  if (!/^[a-z][a-z0-9_]*$/.test(dictionary.dictionary_key)) {
    throw new Error(`Invalid dictionary_key in ${fileName}`);
  }
  if (fileName !== `${dictionary.dictionary_key}.json`) {
    throw new Error(
      `${fileName} must match dictionary_key ${dictionary.dictionary_key}`,
    );
  }

  return dictionary;
});

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
      Object.values(dictionary.words).flatMap((translations) =>
        Object.keys(translations),
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
    PRAGMA user_version = 5;

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

    CREATE TABLE dictionary_items (
      dictionary_key TEXT NOT NULL,
      word TEXT NOT NULL COLLATE NOCASE,
      position INTEGER NOT NULL,
      PRIMARY KEY (dictionary_key, word),
      UNIQUE (dictionary_key, position),
      FOREIGN KEY (dictionary_key) REFERENCES dictionaries(dictionary_key) ON DELETE CASCADE,
      FOREIGN KEY (word) REFERENCES words(word) ON DELETE CASCADE
    ) WITHOUT ROWID;

    CREATE INDEX dictionary_items_word
      ON dictionary_items(word);

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
  const insertDictionaryItem = db.prepare(`
    INSERT INTO dictionary_items (dictionary_key, word, position)
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

    if (
      !dictionary.words ||
      typeof dictionary.words !== 'object' ||
      Array.isArray(dictionary.words)
    ) {
      throw new Error(`${dictionary.dictionary_key} words must be an object`);
    }

    Object.entries(dictionary.words).forEach(([englishWord, translations], position) => {
      const word = englishWord.trim().toLowerCase();
      const entries = Object.entries(translations);

      if (!word || entries.length === 0) {
        throw new Error(
          `Invalid word in dictionary ${dictionary.dictionary_key}: ${englishWord}`,
        );
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

      insertDictionaryItem.run(dictionary.dictionary_key, word, position);
    });
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
