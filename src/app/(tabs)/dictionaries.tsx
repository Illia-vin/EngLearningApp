import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  type ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
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

const DICTIONARY_ICON_SOURCES: Record<string, ImageSourcePropType> = {
  basic_english: require('../../../assets/images/dictionary-icons/basic-english.png'),
  home: require('../../../assets/images/dictionary-icons/home.png'),
};

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
      const result = await getDictionarySelections({
        displayLanguage: locale,
        translationLanguage,
      });
      setDictionaries(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  }, [locale, translationLanguage]);

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
          <DictionaryCard
            key={dictionary.dictionary_key}
            dictionary={dictionary}
            updating={updatingKey === dictionary.dictionary_key}
            wordLabel={t('dictionaries.words')}
            progressLabel={t('dictionaries.progress')}
            toggleLabel={t('dictionaries.toggle', dictionary.name)}
            onOpen={() => openDictionary(dictionary)}
            onToggle={(enabled) => void toggleDictionary(dictionary, enabled)}
          />
        ))}

        {!loading && dictionaries.length === 0 && (
          <ThemedText themeColor="textSecondary">{t('dictionaries.empty')}</ThemedText>
        )}
      </ThemedView>
    </ScrollView>
  );
}

function DictionaryCard({
  dictionary,
  updating,
  wordLabel,
  progressLabel,
  toggleLabel,
  onOpen,
  onToggle,
}: {
  dictionary: DictionarySelection;
  updating: boolean;
  wordLabel: string;
  progressLabel: string;
  toggleLabel: string;
  onOpen: () => void;
  onToggle: (enabled: boolean) => void;
}) {
  const theme = useTheme();
  const iconSource = DICTIONARY_ICON_SOURCES[dictionary.dictionary_key];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={dictionary.name}
      onPress={onOpen}
      style={({ pressed }) => [
        styles.dictionaryCard,
        {
          backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
          borderColor: theme.border,
        },
      ]}>
      <View style={styles.dictionaryHeader}>
        <View style={[styles.dictionaryIcon, { backgroundColor: theme.background }]}>
          {iconSource ? (
            <Image source={iconSource} resizeMode="contain" style={styles.dictionaryImage} />
          ) : (
            <MaterialCommunityIcons name="bookmark-outline" size={26} color={theme.accent} />
          )}
        </View>
        <View style={styles.dictionaryInfo}>
          <ThemedText type="smallBold">{dictionary.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {dictionary.word_count} {wordLabel}
          </ThemedText>
        </View>
        <Pressable
          accessibilityLabel={toggleLabel}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: dictionary.is_enabled, disabled: updating }}
          disabled={updating}
          hitSlop={Spacing.two}
          onPress={() => onToggle(!dictionary.is_enabled)}
          style={styles.checkbox}>
          <MaterialCommunityIcons
            name={dictionary.is_enabled ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={28}
            color={dictionary.is_enabled ? theme.accent : theme.textSecondary}
          />
        </Pressable>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <ThemedText type="small" themeColor="textSecondary">
            {progressLabel}
          </ThemedText>
          <ThemedText type="smallBold" themeColor="accent">
            {dictionary.progress_percent}%
          </ThemedText>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: theme.primary, width: `${dictionary.progress_percent}%` },
            ]}
          />
        </View>
      </View>

    </Pressable>
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
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    minHeight: 128,
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
  dictionaryIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dictionaryImage: {
    width: 44,
    height: 44,
  },
  checkbox: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSection: {
    gap: Spacing.one,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
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
