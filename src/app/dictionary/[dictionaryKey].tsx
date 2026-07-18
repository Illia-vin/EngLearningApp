import DictionariesScreen from '@/app/(tabs)/dictionaries';
import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import type { DictionarySummary } from '@/db/dictionaryRegistry';

export default function DictionaryScreen() {
  const { dictionaryKey, dictionaryName, dictionaryCefr, dictionaryWordCount } = useLocalSearchParams<{
    dictionaryKey?: string;
    dictionaryName?: string;
    dictionaryCefr?: string;
    dictionaryWordCount?: string;
  }>();
  const dictionaryId = Number(dictionaryKey);
  const wordCount = Number(dictionaryWordCount);
  const initialDictionary = useMemo<DictionarySummary | undefined>(
    () => Number.isSafeInteger(dictionaryId) && dictionaryName && dictionaryCefr && Number.isSafeInteger(wordCount)
      ? { id: dictionaryId, name: dictionaryName, cefr: dictionaryCefr, word_count: wordCount }
      : undefined,
    [dictionaryCefr, dictionaryId, dictionaryName, wordCount],
  );

  return <DictionariesScreen dictionaryKey={dictionaryKey} initialDictionary={initialDictionary} />;
}
