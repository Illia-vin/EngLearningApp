import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DetailHeader } from '@/components/detail-header';
import { useTheme } from '@/hooks/use-theme';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useLanguage } from '@/i18n';
import {
  getDictionarySelections,
  setDictionaryEnabled,
  type DictionarySelection,
} from '@/db/dictionaryPreferences';
import { getDictionaryWords, type DictionaryWord } from '@/db/words';
import { getWordProgressMap, MASTERED_REPETITION_COUNT, type UserProgress } from '@/db/progress';
import { getDictionary, type DictionarySummary } from '@/db/dictionaryRegistry';

export default function DictionariesScreen({ dictionaryKey }: { dictionaryKey?: string }) {
  const WORD_PAGE_SIZE = 30;
  const dictionaryId = Number(dictionaryKey);
  const router = useRouter();
  const [dictionaries, setDictionaries] = useState<DictionarySelection[]>([]);
  const [selectedDictionary, setSelectedDictionary] = useState<DictionarySummary | null>(null);
  const [dictionaryWords, setDictionaryWords] = useState<DictionaryWord[]>([]);
  const [progressByWord, setProgressByWord] = useState<Map<number, UserProgress>>(new Map());
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreWords, setHasMoreWords] = useState(false);
  const [updatingKey, setUpdatingKey] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const { locale, translationLanguage, t } = useLanguage();
  const loadedWordCount = useRef(0);
  const loadingMoreRef = useRef(false);
  const dictionaryLoadGeneration = useRef(0);

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
      if (dictionaryKey) {
        return;
      }

      void loadDictionaries();
    }, [dictionaryKey, loadDictionaries]),
  );

  const toggleDictionary = async (dictionary: DictionarySelection, enabled: boolean) => {
    setUpdatingKey(dictionary.id);
    setError(null);
    setDictionaries((current) =>
      current.map((item) =>
        item.id === dictionary.id
          ? { ...item, is_enabled: enabled }
          : item,
      ),
    );

    try {
      await setDictionaryEnabled(dictionary.id, enabled);
    } catch (caught) {
      setDictionaries((current) =>
        current.map((item) =>
          item.id === dictionary.id
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
      params: { dictionaryKey: String(dictionary.id) },
    });
  };

  const loadNextWordPage = useCallback(async () => {
    if (!dictionaryKey || loadingMoreRef.current || !hasMoreWords) return;

    const generation = dictionaryLoadGeneration.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const words = await getDictionaryWords(dictionaryId, translationLanguage, locale, {
        limit: WORD_PAGE_SIZE,
        offset: loadedWordCount.current,
      });
      const progress = await getWordProgressMap(words.map((word) => word.id));
      if (generation !== dictionaryLoadGeneration.current) return;
      loadedWordCount.current += words.length;
      setDictionaryWords((current) => [...current, ...words]);
      setProgressByWord((current) => new Map([...current, ...progress]));
      setHasMoreWords(words.length === WORD_PAGE_SIZE);
    } catch (caught) {
      if (generation === dictionaryLoadGeneration.current) {
        setError(caught instanceof Error ? caught.message : String(caught));
      }
    } finally {
      if (generation === dictionaryLoadGeneration.current) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [dictionaryId, dictionaryKey, hasMoreWords, locale, translationLanguage]);

  useEffect(() => {
    if (!dictionaryKey) {
      return;
    }

    let active = true;
    dictionaryLoadGeneration.current += 1;
    loadedWordCount.current = 0;
    loadingMoreRef.current = false;
    setDictionaryWords([]);
    setProgressByWord(new Map());
    setHasMoreWords(false);
    setDetailLoading(true);
    setError(null);
    Promise.all([
      getDictionary(dictionaryId, locale),
      getDictionaryWords(dictionaryId, translationLanguage, locale, { limit: WORD_PAGE_SIZE }),
    ])
      .then(async ([dictionary, words]) => {
        const progress = await getWordProgressMap(words.map((word) => word.id));
        if (active) {
          loadedWordCount.current = words.length;
          setSelectedDictionary(dictionary);
          setDictionaryWords(words);
          setProgressByWord(progress);
          setHasMoreWords(words.length === WORD_PAGE_SIZE);
          setDetailLoading(false);
        }
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
  }, [dictionaryId, dictionaryKey, locale, translationLanguage]);

  if (dictionaryKey) {
    return (
      <ThemedView style={styles.detailScreen}>
        <ThemedView style={styles.fixedHeader}>
          <View style={styles.fixedHeaderContent}>
            {selectedDictionary && (
              <DetailHeader
                title={selectedDictionary.name}
                subtitle={`${selectedDictionary.word_count} ${t('dictionaries.words')}`}
                onBack={() => router.back()}
              />
            )}
          </View>
        </ThemedView>

        <ScrollView
          style={{ backgroundColor: theme.background }}
          scrollEventThrottle={16}
          onScroll={({ nativeEvent }) => {
            const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
            if (contentOffset.y + layoutMeasurement.height * 2 >= contentSize.height) {
              void loadNextWordPage();
            }
          }}
          contentContainerStyle={[styles.scrollContent, styles.detailScrollContent]}>
          <ThemedView style={styles.content}>
          {detailLoading && <ActivityIndicator color={theme.textSecondary} />}
          {error && <ThemedText themeColor="textSecondary">{error}</ThemedText>}

          {selectedDictionary && !detailLoading && !error && (
            <ThemedView type="backgroundElement" style={[styles.wordList, { borderColor: theme.border }]}>
              {dictionaryWords.map((item, index) => (
                <WordListItem
                  key={item.id}
                  item={item}
                  progress={progressByWord.get(item.id)}
                  t={t}
                  isLast={index === dictionaryWords.length - 1}
                  onPress={() =>
                    router.push({ pathname: '/word/[word]', params: { word: String(item.id) } } as never)
                  }
                />
              ))}
            </ThemedView>
          )}
          {selectedDictionary && !detailLoading && !error && loadingMore && (
            <View style={styles.loadingMore}>
              <ActivityIndicator color={theme.textSecondary} />
            </View>
          )}
          </ThemedView>
        </ScrollView>
      </ThemedView>
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
            key={dictionary.id}
            dictionary={dictionary}
            updating={updatingKey === dictionary.id}
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

function WordListItem({ item, progress, t, isLast, onPress }: {
  item: DictionaryWord;
  progress?: UserProgress;
  t: (key: string) => string;
  isLast: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  let indicatorColor = '#E5E7EB';
  let statusLabel = t('dictionaries.notStarted');

  if (progress?.status === 'known') {
    indicatorColor = '#4B5563';
    statusLabel = t('dictionaries.alreadyKnown');
  } else if (progress?.status === 'mastered') {
    indicatorColor = '#28764A';
    statusLabel = t('dictionaries.mastered');
  } else if (progress) {
    indicatorColor = theme.primary;
    statusLabel = `${t('dictionaries.repetitionsLeftPrefix')} ${Math.max(0, MASTERED_REPETITION_COUNT - progress.repetitions)} ${t('dictionaries.repetitionsRemaining')}`;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.wordRow,
        !isLast && { borderBottomColor: theme.border, borderBottomWidth: 1 },
        {
          backgroundColor: theme.backgroundElement,
        },
      ]}>
      <View pointerEvents="none" style={[styles.statusIndicator, { backgroundColor: indicatorColor }]} />
      <View style={styles.wordInfo}>
        <ThemedText type="small" themeColor="textSecondary">{statusLabel}</ThemedText>
        <ThemedText type="default" style={styles.capitalize}>{item.word}</ThemedText>
        <ThemedText type="default" themeColor="textSecondary">{item.translation}</ThemedText>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color={theme.textSecondary} />
    </Pressable>
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={dictionary.name}
      onPress={onOpen}
      style={[
        styles.dictionaryCard,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
        },
      ]}>
      <View style={styles.dictionaryHeader}>
        <View style={[styles.dictionaryIcon, { backgroundColor: theme.background }]}>
          <MaterialCommunityIcons name="bookmark-outline" size={26} color={theme.accent} />
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
  detailScreen: {
    flex: 1,
  },
  fixedHeader: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  fixedHeaderContent: {
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  scrollContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
  },
  detailScrollContent: {
    paddingTop: 0,
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
  wordList: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    overflow: 'hidden',
  },
  loadingMore: {
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordRow: {
    paddingVertical: Spacing.three,
    paddingRight: Spacing.three,
    paddingLeft: Spacing.four + Spacing.two,
    minHeight: 112,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  wordInfo: {
    flex: 1,
    gap: Spacing.one,
  },
  statusIndicator: {
    position: 'absolute',
    top: Spacing.three,
    bottom: Spacing.three,
    left: Spacing.two,
    width: 5,
  },
  capitalize: {
    textTransform: 'capitalize',
  },
});
