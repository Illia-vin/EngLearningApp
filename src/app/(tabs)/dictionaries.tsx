import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useLanguage } from '@/i18n';
import {
  getDictionarySelections,
  setDictionaryEnabled,
  type DictionarySelection,
} from '@/db/dictionaryPreferences';
import { getDictionaryWords, type DictionaryWord } from '@/db/words';

export default function DictionariesScreen({ dictionaryKey }: { dictionaryKey?: string }) {
  const router = useRouter();
  const [dictionaries, setDictionaries] = useState<DictionarySelection[]>([]);
  const [dictionaryWords, setDictionaryWords] = useState<DictionaryWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const { locale, translationLanguage, t } = useLanguage();

  const loadDictionaries = useCallback(async () => {
    setError(null);
    try {
      const result = await getDictionarySelections(locale);
      setDictionaries(result);
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

  const openDictionary = (dictionary: DictionarySelection) => {
    router.push({
      pathname: '/dictionary/[dictionaryKey]',
      params: { dictionaryKey: dictionary.dictionary_key },
    });
  };

  const selectedDictionary = dictionaryKey
    ? dictionaries.find((dictionary) => dictionary.dictionary_key === dictionaryKey) ?? null
    : null;

  useEffect(() => {
    if (!selectedDictionary) {
      return;
    }

    let active = true;
    setDictionaryWords([]);
    setDetailLoading(true);
    setError(null);
    getDictionaryWords(selectedDictionary.dictionary_key, translationLanguage)
      .then((words) => {
        if (active) setDictionaryWords(words);
      })
      .catch((caught) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : String(caught));
        }
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedDictionary?.dictionary_key, translationLanguage]);

  if (selectedDictionary) {
    return (
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.scrollContent}>
        <ThemedView style={styles.content}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={theme.accent} />
            <ThemedText type="smallBold">{t('common.back')}</ThemedText>
          </Pressable>

          <View style={styles.screenHeader}>
            <ThemedText type="subtitle">{selectedDictionary.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {selectedDictionary.word_count} {t('dictionaries.words')}
            </ThemedText>
          </View>

          {detailLoading && <ActivityIndicator color={theme.textSecondary} />}
          {error && <ThemedText themeColor="textSecondary">{error}</ThemedText>}

          {!detailLoading && !error && (
            <ThemedView
              type="backgroundElement"
              style={[styles.wordList, { borderColor: theme.border }]}>
              {dictionaryWords.map((item, index) => (
                <View
                  key={item.word}
                  style={[
                    styles.wordRow,
                    index < dictionaryWords.length - 1 && {
                      borderBottomColor: theme.border,
                      borderBottomWidth: 1,
                    },
                  ]}>
                  <ThemedText type="smallBold" style={styles.capitalize}>
                    {item.word}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.translation}
                  </ThemedText>
                </View>
              ))}
            </ThemedView>
          )}
        </ThemedView>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.scrollContent}>
      <ThemedView style={styles.content}>
        <View style={styles.screenHeader}>
          <ThemedText type="title">{t('navigation.dictionaries')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('dictionaries.description')}
          </ThemedText>
        </View>

        {loading && <ActivityIndicator color={theme.textSecondary} />}
        {error && <ThemedText themeColor="textSecondary">{error}</ThemedText>}

        {!loading && dictionaries.map((dictionary) => (
          <ThemedView
            key={dictionary.dictionary_key}
            type="backgroundElement"
            style={[styles.dictionaryCard, { borderColor: theme.border }]}>
            <View style={styles.dictionaryHeader}>
              <View style={styles.dictionaryInfo}>
                <ThemedText type="smallBold">{dictionary.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  EN → {dictionary.translation_languages?.toUpperCase().replaceAll(',', ', ')} ·{' '}
                  {dictionary.word_count} {t('dictionaries.words')}
                </ThemedText>
              </View>
              <Switch
                accessibilityLabel={t('dictionaries.toggle', dictionary.name)}
                value={dictionary.is_enabled}
                disabled={updatingKey === dictionary.dictionary_key}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={theme.control}
                onValueChange={(enabled) => void toggleDictionary(dictionary, enabled)}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => openDictionary(dictionary)}
              style={({ pressed }) => [
                styles.openButton,
                {
                  backgroundColor: pressed ? theme.border : theme.backgroundSelected,
                  borderColor: theme.border,
                },
              ]}>
              <ThemedText type="smallBold" themeColor="accent">
                {t('dictionaries.open')}
              </ThemedText>
              <MaterialCommunityIcons name="chevron-right" size={22} color={theme.accent} />
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
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
  },
  content: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    gap: Spacing.three,
  },
  screenHeader: {
    gap: Spacing.two,
  },
  dictionaryCard: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
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
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
  },
  wordList: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    overflow: 'hidden',
  },
  wordRow: {
    padding: Spacing.three,
    gap: Spacing.one,
  },
  capitalize: {
    textTransform: 'capitalize',
  },
});
