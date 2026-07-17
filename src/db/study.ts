import { getEnabledDictionaryKeys } from './dictionaryPreferences';
import { getUserDatabase } from './userDatabase';
import {
  DEFAULT_TRANSLATION_LANGUAGE,
  getWordsForDictionaries,
  type DictionaryWord,
} from './words';
import {
  getWordProgress,
  saveWordProgress,
  type UserProgress,
} from './progress';

export interface StudySnapshot {
  dueWords: DictionaryWord[];
  newWords: DictionaryWord[];
  enabledDictionaryCount: number;
  learningCount: number;
  nextReviewAt: number | null;
}

const REVIEW_AGAIN_SECONDS = 10 * 60;
const DAY_SECONDS = 24 * 60 * 60;

function nowInSeconds() {
  return Math.floor(Date.now() / 1000);
}

export async function getStudySnapshot(
  language = DEFAULT_TRANSLATION_LANGUAGE,
): Promise<StudySnapshot> {
  const enabledDictionaryKeys = await getEnabledDictionaryKeys();
  const words = await getWordsForDictionaries(enabledDictionaryKeys, language);
  const userDatabase = await getUserDatabase();
  const progressRows = await userDatabase.getAllAsync<UserProgress>(
    'SELECT * FROM user_progress',
  );
  const progressByWord = new Map(
    progressRows.map((progress) => [progress.word.toLowerCase(), progress]),
  );
  const now = nowInSeconds();
  let learningCount = 0;
  let nextReviewAt: number | null = null;
  const dueWords: DictionaryWord[] = [];
  const newWords: DictionaryWord[] = [];

  for (const word of words) {
    const progress = progressByWord.get(word.word.toLowerCase());
    if (!progress) {
      newWords.push(word);
      continue;
    }

    if (progress.status !== 'learning') {
      continue;
    }

    learningCount += 1;
    if (progress.next_review_at === null || progress.next_review_at <= now) {
      dueWords.push(word);
    } else if (nextReviewAt === null || progress.next_review_at < nextReviewAt) {
      nextReviewAt = progress.next_review_at;
    }
  }

  dueWords.sort((left, right) => {
    const leftDue = progressByWord.get(left.word)?.next_review_at ?? 0;
    const rightDue = progressByWord.get(right.word)?.next_review_at ?? 0;
    return leftDue - rightDue || left.word.localeCompare(right.word);
  });

  return {
    dueWords,
    newWords,
    enabledDictionaryCount: enabledDictionaryKeys.length,
    learningCount,
    nextReviewAt,
  };
}

export async function markWordKnown(word: string): Promise<void> {
  const now = nowInSeconds();
  await saveWordProgress({
    word,
    status: 'known',
    ease_factor: 2.5,
    interval_days: 0,
    repetitions: 0,
    next_review_at: null,
    updated_at: now,
  });
}

export async function startLearningWord(word: string): Promise<void> {
  const now = nowInSeconds();
  await saveWordProgress({
    word,
    status: 'learning',
    ease_factor: 2.5,
    interval_days: 0,
    repetitions: 0,
    next_review_at: now,
    updated_at: now,
  });
}

export async function reviewWord(
  word: string,
  result: 'again' | 'remembered',
): Promise<void> {
  const progress = await getWordProgress(word);
  if (!progress || progress.status !== 'learning') {
    throw new Error(`Word is not being learned: ${word}`);
  }

  const now = nowInSeconds();
  if (result === 'again') {
    await saveWordProgress({
      ...progress,
      next_review_at: now + REVIEW_AGAIN_SECONDS,
      updated_at: now,
    });
    return;
  }

  const repetitions = progress.repetitions + 1;
  const intervalDays =
    repetitions === 1
      ? 1
      : repetitions === 2
        ? 3
        : Math.max(4, Math.round(progress.interval_days * progress.ease_factor));

  await saveWordProgress({
    ...progress,
    interval_days: intervalDays,
    repetitions,
    next_review_at: now + intervalDays * DAY_SECONDS,
    updated_at: now,
  });
}
