import { Redirect, useLocalSearchParams } from 'expo-router';

import WordsScreen from '@/app/(tabs)/words';

export default function StudyScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();

  if (mode !== 'new' && mode !== 'review') {
    return <Redirect href="/words" />;
  }

  return <WordsScreen mode={mode} />;
}
