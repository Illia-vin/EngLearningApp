import DictionariesScreen from '@/app/(tabs)/dictionaries';
import { useLocalSearchParams } from 'expo-router';

export default function DictionaryScreen() {
  const { dictionaryKey } = useLocalSearchParams<{ dictionaryKey?: string }>();

  return <DictionariesScreen dictionaryKey={dictionaryKey} />;
}
