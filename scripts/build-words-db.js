const { existsSync, mkdirSync, readFileSync, renameSync, rmSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const projectRoot = resolve(__dirname, '..');
const sourcePath = join(projectRoot, 'src', 'db', 'seeds', 'dictionaries', 'oxford_5000.json');
const outputDirectory = join(projectRoot, 'assets', 'databases');
const outputPath = join(outputDirectory, 'words.db');
const temporaryOutputPath = `${outputPath}.tmp`;
const dictionaryNames = {
  a1: { en: 'Beginner (A1)', uk: 'Початковий (A1)', es: 'Principiante (A1)' },
  a2: { en: 'Elementary (A2)', uk: 'Базовий (A2)', es: 'Elemental (A2)' },
  b1: { en: 'Intermediate (B1)', uk: 'Середній (B1)', es: 'Intermedio (B1)' },
  b2: { en: 'Upper-intermediate (B2)', uk: 'Вище середнього (B2)', es: 'Intermedio alto (B2)' },
  c1: { en: 'Advanced (C1)', uk: 'Просунутий (C1)', es: 'Avanzado (C1)' },
};
const wordTypeNames = {
  adjective: { en: 'Adjective', uk: 'Прикметник', es: 'Adjetivo' },
  adverb: { en: 'Adverb', uk: 'Прислівник', es: 'Adverbio' },
  'auxiliary verb': { en: 'Auxiliary verb', uk: 'Допоміжне дієслово', es: 'Verbo auxiliar' },
  conjunction: { en: 'Conjunction', uk: 'Сполучник', es: 'Conjunción' },
  'definite article': { en: 'Definite article', uk: 'Означений артикль', es: 'Artículo definido' },
  determiner: { en: 'Determiner', uk: 'Визначник', es: 'Determinante' },
  exclamation: { en: 'Exclamation', uk: 'Вигук', es: 'Exclamación' },
  'indefinite article': { en: 'Indefinite article', uk: 'Неозначений артикль', es: 'Artículo indefinido' },
  'infinitive marker': { en: 'Infinitive marker', uk: 'Маркер інфінітива', es: 'Marcador de infinitivo' },
  'linking verb': { en: 'Linking verb', uk: 'Дієслово-зв’язка', es: 'Verbo copulativo' },
  'modal verb': { en: 'Modal verb', uk: 'Модальне дієслово', es: 'Verbo modal' },
  noun: { en: 'Noun', uk: 'Іменник', es: 'Sustantivo' },
  number: { en: 'Number', uk: 'Числівник', es: 'Número' },
  'ordinal number': { en: 'Ordinal number', uk: 'Порядковий числівник', es: 'Número ordinal' },
  preposition: { en: 'Preposition', uk: 'Прийменник', es: 'Preposición' },
  pronoun: { en: 'Pronoun', uk: 'Займенник', es: 'Pronombre' },
  verb: { en: 'Verb', uk: 'Дієслово', es: 'Verbo' },
};

function normalizeCefr(value, entryId) {
  const values = Array.isArray(value) ? value : [value];
  const levels = values.flatMap((item) => {
    if (typeof item === 'string') return [item];
    if (item && typeof item === 'object') return Object.values(item);
    return [];
  }).map((level) => String(level).trim().toLowerCase()).filter(Boolean);
  const unique = [...new Set(levels)];
  if (unique.length === 0 || unique.some((level) => !dictionaryNames[level])) {
    throw new Error(`Invalid CEFR value for word ${entryId}: ${JSON.stringify(value)}`);
  }
  return unique;
}

function text(value, field, entryId) {
  if (typeof value !== 'string') throw new Error(`${field} must be a string for word ${entryId}`);
  return value;
}

function encodedPhonetic(value, field, entryId) {
  return encodeURIComponent(text(value, field, entryId));
}

const raw = JSON.parse(readFileSync(sourcePath, 'utf8'));
const entries = Object.entries(raw)
  .filter(([id]) => /^\d+$/.test(id))
  .map(([rawId, entry]) => {
    const id = Number(rawId);
    if (!Number.isSafeInteger(id) || id < 0 || !entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`Invalid word entry ${rawId}`);
    }
    const cefr = normalizeCefr(entry.cefr, id);
    return {
      id,
      word: text(entry.word, 'word', id), type: text(entry.type, 'type', id), cefr, cefrRaw: typeof entry.cefr === 'string' ? entry.cefr : JSON.stringify(entry.cefr),
      phon_br: encodedPhonetic(entry.phon_br, 'phon_br', id), phon_n_am: encodedPhonetic(entry.phon_n_am, 'phon_n_am', id),
      definition: text(entry.definition, 'definition', id), example: text(entry.example, 'example', id),
      translation_uk: text(entry.translation_uk, 'translation_uk', id),
      translation_es: text(entry.translation_es, 'translation_es', id),
      uk: text(entry.uk, 'uk', id), us: text(entry.us, 'us', id),
    };
  })
  .sort((left, right) => left.id - right.id);

if (entries.length === 0) throw new Error('Oxford source contains no word entries');
if (new Set(entries.map((entry) => entry.id)).size !== entries.length) throw new Error('Duplicate word IDs');
if (entries.some((entry) => !wordTypeNames[entry.type])) throw new Error('Unknown word type in Oxford source');

mkdirSync(outputDirectory, { recursive: true });
if (existsSync(temporaryOutputPath)) rmSync(temporaryOutputPath);
const db = new DatabaseSync(temporaryOutputPath);
try {
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = DELETE;
    PRAGMA user_version = 1;

    CREATE TABLE dictionaries (
      id INTEGER PRIMARY KEY,
      cefr TEXT NOT NULL UNIQUE,
      word_count INTEGER NOT NULL CHECK (word_count >= 0)
    );
    CREATE TABLE dictionary_names (
      dictionary_id INTEGER NOT NULL REFERENCES dictionaries(id) ON DELETE CASCADE,
      language TEXT NOT NULL,
      name TEXT NOT NULL,
      PRIMARY KEY (dictionary_id, language)
    ) WITHOUT ROWID;
    CREATE TABLE words (
      id INTEGER PRIMARY KEY,
      word TEXT NOT NULL,
      type_id INTEGER NOT NULL REFERENCES word_types(id),
      cefr TEXT NOT NULL,
      phon_br TEXT NOT NULL,
      phon_n_am TEXT NOT NULL,
      definition TEXT NOT NULL,
      example TEXT NOT NULL,
      translation_uk TEXT NOT NULL,
      translation_es TEXT NOT NULL,
      uk TEXT NOT NULL,
      us TEXT NOT NULL
    );
    CREATE TABLE word_types (
      id INTEGER PRIMARY KEY,
      code TEXT NOT NULL UNIQUE
    );
    CREATE TABLE word_type_names (
      type_id INTEGER NOT NULL REFERENCES word_types(id) ON DELETE CASCADE,
      language TEXT NOT NULL,
      name TEXT NOT NULL,
      PRIMARY KEY (type_id, language)
    ) WITHOUT ROWID;
    CREATE INDEX words_word ON words(word COLLATE NOCASE);
    CREATE TABLE dictionary_words (
      dictionary_id INTEGER NOT NULL REFERENCES dictionaries(id) ON DELETE CASCADE,
      word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
      PRIMARY KEY (dictionary_id, word_id)
    ) WITHOUT ROWID;
    CREATE INDEX dictionary_words_word_id ON dictionary_words(word_id);
  `);
  const insertDictionary = db.prepare('INSERT INTO dictionaries (id, cefr, word_count) VALUES (?, ?, 0)');
  const insertName = db.prepare('INSERT INTO dictionary_names (dictionary_id, language, name) VALUES (?, ?, ?)');
  const insertWord = db.prepare(`INSERT INTO words (id, word, type_id, cefr, phon_br, phon_n_am, definition, example, translation_uk, translation_es, uk, us)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertWordType = db.prepare('INSERT INTO word_types (id, code) VALUES (?, ?)');
  const insertWordTypeName = db.prepare('INSERT INTO word_type_names (type_id, language, name) VALUES (?, ?, ?)');
  const insertRelation = db.prepare('INSERT INTO dictionary_words (dictionary_id, word_id) VALUES (?, ?)');
  const updateCount = db.prepare('UPDATE dictionaries SET word_count = (SELECT COUNT(*) FROM dictionary_words WHERE dictionary_id = ?) WHERE id = ?');
  const dictionaryIds = new Map();
  const wordTypeIds = new Map();
  db.exec('BEGIN IMMEDIATE');
  Object.entries(dictionaryNames).forEach(([cefr, names], index) => {
    const id = index + 1;
    dictionaryIds.set(cefr, id);
    insertDictionary.run(id, cefr);
    Object.entries(names).forEach(([language, name]) => insertName.run(id, language, name));
  });
  Object.entries(wordTypeNames).forEach(([code, names], index) => {
    const id = index + 1;
    wordTypeIds.set(code, id);
    insertWordType.run(id, code);
    Object.entries(names).forEach(([language, name]) => insertWordTypeName.run(id, language, name));
  });
  for (const entry of entries) {
    insertWord.run(entry.id, entry.word, wordTypeIds.get(entry.type), entry.cefrRaw, entry.phon_br, entry.phon_n_am, entry.definition, entry.example, entry.translation_uk, entry.translation_es, entry.uk, entry.us);
    entry.cefr.forEach((cefr) => insertRelation.run(dictionaryIds.get(cefr), entry.id));
  }
  for (const id of dictionaryIds.values()) updateCount.run(id, id);
  db.exec('COMMIT');
  const integrity = db.prepare('PRAGMA integrity_check').get();
  if (integrity.integrity_check !== 'ok') throw new Error(`SQLite integrity check failed: ${integrity.integrity_check}`);
  if (db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('SQLite foreign key check failed');
  db.exec('VACUUM');
} catch (error) {
  try { db.exec('ROLLBACK'); } catch {}
  db.close();
  if (existsSync(temporaryOutputPath)) rmSync(temporaryOutputPath);
  throw error;
}
db.close();
if (existsSync(outputPath)) rmSync(outputPath);
renameSync(temporaryOutputPath, outputPath);
console.log(`Created ${outputPath} with ${entries.length} words`);
