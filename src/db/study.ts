import { getEnabledDictionaryIds } from './dictionaryPreferences';
import { getUserDatabase } from './userDatabase';
import {
  getWordsForDictionaries,
  type DictionaryWord,
} from './words';
import {
  getWordProgress,
  MASTERED_REPETITION_COUNT,
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

const DAY_SECONDS = 24 * 60 * 60;
const MIN_REVIEW_INTERVAL_SECONDS = 10 * 60;

function nowInSeconds() {
  return Math.floor(Date.now() / 1000);
}

export async function getStudySnapshot(
  language: 'uk' | 'es' = 'uk',
  displayLanguage: 'uk' | 'en' | 'es' = 'en',
): Promise<StudySnapshot> {
  const enabledDictionaryIds = await getEnabledDictionaryIds();
  const words = await getWordsForDictionaries(enabledDictionaryIds, language, displayLanguage);
  const userDatabase = await getUserDatabase();
  const progressRows = await userDatabase.getAllAsync<UserProgress>(
    'SELECT * FROM user_progress',
  );
  const progressByWord = new Map(
    progressRows.map((progress) => [progress.word_id, progress]),
  );
  const now = nowInSeconds();
  let learningCount = 0;
  let nextReviewAt: number | null = null;
  const dueWords: DictionaryWord[] = [];
  const newWords: DictionaryWord[] = [];

  for (const word of words) {
    const progress = progressByWord.get(word.id);
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
    const leftProgress = progressByWord.get(left.id);
    const rightProgress = progressByWord.get(right.id);
    return (
      (leftProgress?.updated_at ?? 0) - (rightProgress?.updated_at ?? 0) ||
      left.word.localeCompare(right.word)
    );
  });

  return {
    dueWords,
    newWords,
    enabledDictionaryCount: enabledDictionaryIds.length,
    learningCount,
    nextReviewAt,
  };
}

export async function markWordKnown(word_id: number): Promise<void> {
  await saveWordProgress({
    word_id,
    status: 'known',
    ease_factor: 2.5,
    interval_days: 0,
    repetitions: 0,
    difficulty: 0,
    next_review_at: null,
    updated_at: Date.now(),
  });
}

export async function startLearningWord(word_id: number): Promise<void> {
  await saveWordProgress({
    word_id,
    status: 'learning',
    ease_factor: 2.5,
    interval_days: 0,
    repetitions: 0,
    difficulty: 0,
    next_review_at: null,
    updated_at: Date.now(),
  });
}

export async function reviewWord(
  word_id: number,
  result: 'again' | 'remembered',
): Promise<void> {
  const progress = await getWordProgress(word_id);
  if (!progress || progress.status !== 'learning') {
    throw new Error(`Word is not being learned: ${word_id}`);
  }

  const now = nowInSeconds();
  if (result === 'again') {
    await saveWordProgress({
      ...progress,
      ease_factor: Math.max(1.3, progress.ease_factor - 0.15),
      difficulty: progress.difficulty + 1,
      next_review_at: null,
      updated_at: Date.now(),
    });
    return;
  }

  const repetitions = progress.repetitions + 1;
  if (repetitions >= MASTERED_REPETITION_COUNT) {
    await saveWordProgress({
      ...progress,
      status: 'mastered',
      repetitions,
      next_review_at: null,
      updated_at: Date.now(),
    });
    return;
  }

  const baseIntervalDays =
    repetitions === 1
      ? 1
      : repetitions === 2
        ? 3
        : Math.max(4, Math.round(progress.interval_days * progress.ease_factor));
  const difficultyMultiplier = Math.pow(0.65, progress.difficulty);
  const intervalSeconds = Math.max(
    MIN_REVIEW_INTERVAL_SECONDS,
    Math.round(baseIntervalDays * DAY_SECONDS * difficultyMultiplier),
  );
  const intervalDays = intervalSeconds / DAY_SECONDS;

  await saveWordProgress({
    ...progress,
    interval_days: intervalDays,
    repetitions,
    next_review_at: now + intervalSeconds,
    updated_at: Date.now(),
  });
}
