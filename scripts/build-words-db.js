const {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
} = require('node:fs');
const { join, resolve } = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const projectRoot = resolve(__dirname, '..');
const dictionariesDirectory = join(projectRoot, 'src', 'db', 'seeds', 'dictionaries');
const outputDirectory = join(projectRoot, 'assets', 'databases');
const outputPath = join(outputDirectory, 'words.db');
const temporaryOutputPath = `${outputPath}.tmp`;
const KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

function normalizeWord(value) {
  return String(value ?? '').trim().toLowerCase();
}

function validateLocalizedNames(dictionaryKey, names) {
  if (!names || typeof names !== 'object' || Array.isArray(names)) {
    throw new Error(`${dictionaryKey} name must be an object keyed by language`);
  }
  if (typeof names.en !== 'string' || !names.en.trim()) {
    throw new Error(`${dictionaryKey} must have a non-empty English name fallback`);
  }
}

function normalizeTranslationVariants(word, language, rawVariants) {
  if (!Array.isArray(rawVariants)) {
    throw new Error(`${word}.${language} must be an array of translations`);
  }

  const variants = rawVariants
    .map((value) => String(value ?? '').trim())
    .filter(Boolean);
  const uniqueVariants = [...new Set(variants)];
  if (uniqueVariants.length === 0) {
    throw new Error(`${word}.${language} must contain a non-empty translation`);
  }
  return uniqueVariants;
}

const seedFiles = readdirSync(dictionariesDirectory, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
  .map((entry) => entry.name)
  .sort();

if (seedFiles.length === 0) {
  throw new Error(`No dictionary seeds found in ${dictionariesDirectory}`);
}

const mergedWords = new Map();
const manifest = seedFiles.map((fileName) => {
  const dictionary = JSON.parse(
    readFileSync(join(dictionariesDirectory, fileName), 'utf8'),
  );

  if (!dictionary || typeof dictionary !== 'object' || Array.isArray(dictionary)) {
    throw new Error(`${fileName} must contain exactly one dictionary object`);
  }
  if (!KEY_PATTERN.test(dictionary.dictionary_key)) {
    throw new Error(`Invalid dictionary_key in ${fileName}`);
  }
  if (fileName !== `${dictionary.dictionary_key}.json`) {
    throw new Error(`${fileName} must match dictionary_key ${dictionary.dictionary_key}`);
  }
  validateLocalizedNames(dictionary.dictionary_key, dictionary.name);

  if (
    !dictionary.words ||
    typeof dictionary.words !== 'object' ||
    Array.isArray(dictionary.words)
  ) {
    throw new Error(`${dictionary.dictionary_key} words must be an object`);
  }

  const languages = new Set();
  const words = Object.entries(dictionary.words).map(
    ([rawEnglishWord, rawTranslations], position) => {
      const word = normalizeWord(rawEnglishWord);
      if (!word) {
        throw new Error(`Empty English word in ${dictionary.dictionary_key}`);
      }
      if (
        !rawTranslations ||
        typeof rawTranslations !== 'object' ||
        Array.isArray(rawTranslations)
      ) {
        throw new Error(`${word} translations must be an object keyed by language`);
      }

      let mergedTranslations = mergedWords.get(word);
      if (!mergedTranslations) {
        mergedTranslations = new Map();
        mergedWords.set(word, mergedTranslations);
      }

      for (const [language, rawVariants] of Object.entries(rawTranslations)) {
        if (!KEY_PATTERN.test(language)) {
          throw new Error(`Invalid translation language for ${word}: ${language}`);
        }

        const variants = normalizeTranslationVariants(word, language, rawVariants);
        const storedVariants = mergedTranslations.get(language) ?? [];
        for (const variant of variants) {
          if (!storedVariants.includes(variant)) {
            storedVariants.push(variant);
          }
        }
        mergedTranslations.set(language, storedVariants);
        languages.add(language);
      }

      return { word, position };
    },
  );

  if (words.length === 0) {
    throw new Error(`${dictionary.dictionary_key} must contain at least one word`);
  }

  return { ...dictionary, words, languages: [...languages].sort() };
});

if (manifest.filter((dictionary) => dictionary.is_default).length !== 1) {
  throw new Error('Exactly one dictionary must have is_default=true');
}

mkdirSync(outputDirectory, { recursive: true });
if (existsSync(temporaryOutputPath)) {
  rmSync(temporaryOutputPath);
}

const db = new DatabaseSync(temporaryOutputPath);
try {
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = DELETE;
    PRAGMA user_version = 6;

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
      language TEXT NOT NULL,
      translation TEXT NOT NULL,
      position INTEGER NOT NULL,
      PRIMARY KEY (word, language, position),
      UNIQUE (word, language, translation),
      FOREIGN KEY (word) REFERENCES words(word) ON DELETE CASCADE
    ) WITHOUT ROWID;

    CREATE INDEX translations_language ON translations(language);

    CREATE TABLE dictionary_items (
      dictionary_key TEXT NOT NULL,
      word TEXT NOT NULL COLLATE NOCASE,
      position INTEGER NOT NULL,
      PRIMARY KEY (dictionary_key, word),
      UNIQUE (dictionary_key, position),
      FOREIGN KEY (dictionary_key) REFERENCES dictionaries(dictionary_key) ON DELETE CASCADE,
      FOREIGN KEY (word) REFERENCES words(word) ON DELETE CASCADE
    ) WITHOUT ROWID;

    CREATE INDEX dictionary_items_word ON dictionary_items(word);
  `);

  const insertDictionary = db.prepare(`
    INSERT INTO dictionaries (dictionary_key, is_default) VALUES (?, ?)
  `);
  const insertDictionaryName = db.prepare(`
    INSERT INTO dictionary_names (dictionary_key, language, name) VALUES (?, ?, ?)
  `);
  const insertDictionaryLanguage = db.prepare(`
    INSERT INTO dictionary_languages (dictionary_key, language) VALUES (?, ?)
  `);
  const insertWord = db.prepare(`INSERT INTO words (word) VALUES (?)`);
  const insertTranslation = db.prepare(`
    INSERT INTO translations (word, language, translation, position)
    VALUES (?, ?, ?, ?)
  `);
  const insertDictionaryItem = db.prepare(`
    INSERT INTO dictionary_items (dictionary_key, word, position) VALUES (?, ?, ?)
  `);

  db.exec('BEGIN IMMEDIATE');

  for (const [word, translations] of mergedWords) {
    insertWord.run(word);
    for (const [language, variants] of translations) {
      variants.forEach((translation, position) => {
        insertTranslation.run(word, language, translation, position);
      });
    }
  }

  for (const dictionary of manifest) {
    insertDictionary.run(dictionary.dictionary_key, dictionary.is_default ? 1 : 0);

    for (const [language, rawName] of Object.entries(dictionary.name)) {
      const name = String(rawName ?? '').trim();
      if (!KEY_PATTERN.test(language) || !name) {
        throw new Error(`Invalid ${language} name for ${dictionary.dictionary_key}`);
      }
      insertDictionaryName.run(dictionary.dictionary_key, language, name);
    }

    for (const language of dictionary.languages) {
      insertDictionaryLanguage.run(dictionary.dictionary_key, language);
    }
    for (const { word, position } of dictionary.words) {
      insertDictionaryItem.run(dictionary.dictionary_key, word, position);
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
  db.exec('VACUUM');
} catch (error) {
  try {
    db.exec('ROLLBACK');
  } catch {
    // The transaction may already be closed.
  }
  db.close();
  if (existsSync(temporaryOutputPath)) {
    rmSync(temporaryOutputPath);
  }
  throw error;
}

db.close();
try {
  if (existsSync(outputPath)) {
    rmSync(outputPath);
  }
  renameSync(temporaryOutputPath, outputPath);
} catch (error) {
  if (existsSync(temporaryOutputPath)) {
    rmSync(temporaryOutputPath);
  }
  throw error;
}

console.log(`Created ${outputPath}`);
