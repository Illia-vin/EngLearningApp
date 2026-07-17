import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useLanguage } from '@/i18n';
import {
  getDictionarySelections,
  setDictionaryEnabled,
  type DictionarySelection,
} from '@/db/dictionaryPreferences';
import { getDictionaryWords, type DictionaryWord } from '@/db/words';

export default function DictionariesScreen() {
  const [dictionaries, setDictionaries] = useState<DictionarySelection[]>([]);
  const [selectedDictionary, setSelectedDictionary] = useState<DictionarySelection | null>(null);
  const [dictionaryWords, setDictionaryWords] = useState<DictionaryWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { locale, t } = useLanguage();

  const loadDictionaries = useCallback(async () => {
    setError(null);
    try {
      setDictionaries(await getDictionarySelections(locale));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useFocusEffect(
    useCallback(() => {
      void loadDictionaries();
    }, [loadDictionaries]),
  );

  const toggleDictionary = async (dictionary: DictionarySelection, enabled: boolean) => {
    setUpdatingKey(dictionary.dictionary_key);
    setError(null);
    setDictionaries((current) =>
      current.map((item) =>
        item.dictionary_key === dictionary.dictionary_key
          ? { ...item, is_enabled: enabled }
          : item,
      ),
    );

    try {
      await setDictionaryEnabled(dictionary.dictionary_key, enabled);
    } catch (caught) {
      setDictionaries((current) =>
        current.map((item) =>
          item.dictionary_key === dictionary.dictionary_key
            ? { ...item, is_enabled: !enabled }
            : item,
        ),
      );
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setUpdatingKey(null);
    }
  };

  const openDictionary = async (dictionary: DictionarySelection) => {
    setSelectedDictionary(dictionary);
    setDictionaryWords([]);
    setDetailLoading(true);
    setError(null);
    try {
      setDictionaryWords(await getDictionaryWords(dictionary.dictionary_key));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setDetailLoading(false);
    }
  };

  const contentInset = {
    top: insets.top,
    left: insets.left,
    right: insets.right,
    bottom: insets.bottom + BottomTabInset + Spacing.three,
  };

  if (selectedDictionary) {
    return (
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentInset={contentInset}
        contentContainerStyle={styles.scrollContent}>
        <ThemedView style={styles.content}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setSelectedDictionary(null)}
            style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={theme.text} />
            <ThemedText type="smallBold">{t('common.back')}</ThemedText>
          </Pressable>

          <ThemedText type="subtitle">{selectedDictionary.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {selectedDictionary.word_count} {t('dictionaries.words')}
          </ThemedText>

          {detailLoading && <ActivityIndicator color={theme.textSecondary} />}
          {error && <ThemedText themeColor="textSecondary">{error}</ThemedText>}

          {!detailLoading && !error && dictionaryWords.map((item) => (
            <ThemedView
              key={item.word}
              type="backgroundElement"
              style={styles.wordRow}>
              <ThemedText type="smallBold" style={styles.capitalize}>{item.word}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.translation}
              </ThemedText>
            </ThemedView>
          ))}
        </ThemedView>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentInset={contentInset}
      contentContainerStyle={styles.scrollContent}>
      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          {t('navigation.dictionaries')}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('dictionaries.description')}
        </ThemedText>

        {loading && <ActivityIndicator color={theme.textSecondary} />}
        {error && <ThemedText themeColor="textSecondary">{error}</ThemedText>}

        {!loading && dictionaries.map((dictionary) => (
          <ThemedView
            key={dictionary.dictionary_key}
            type="backgroundElement"
            style={styles.dictionaryCard}>
            <View style={styles.dictionaryHeader}>
              <View style={styles.dictionaryInfo}>
                <ThemedText type="smallBold">{dictionary.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  EN → {dictionary.translation_languages?.toUpperCase().replaceAll(',', ', ')} ·{' '}
                  {dictionary.word_count} {t('dictionaries.words')} · {dictionary.list_count}{' '}
                  {t('dictionaries.lists')}
                </ThemedText>
              </View>
              <Switch
                accessibilityLabel={t('dictionaries.toggle', dictionary.name)}
                value={dictionary.is_enabled}
                disabled={updatingKey === dictionary.dictionary_key}
                onValueChange={(enabled) => void toggleDictionary(dictionary, enabled)}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => void openDictionary(dictionary)}
              style={({ pressed }) => [
                styles.openButton,
                { backgroundColor: pressed ? theme.backgroundSelected : theme.background },
              ]}>
              <ThemedText type="smallBold">{t('dictionaries.open')}</ThemedText>
              <MaterialCommunityIcons name="chevron-right" size={22} color={theme.text} />
            </Pressable>
          </ThemedView>
        ))}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
  },
  content: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    gap: Spacing.three,
  },
  title: {
    marginBottom: Spacing.two,
  },
  dictionaryCard: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  dictionaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  dictionaryInfo: {
    flex: 1,
    gap: Spacing.one,
  },
  openButton: {
    minHeight: 44,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
  },
  wordRow: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  capitalize: {
    textTransform: 'capitalize',
  },
});
