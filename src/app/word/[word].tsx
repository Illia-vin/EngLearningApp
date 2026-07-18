import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { DetailHeader } from '@/components/detail-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useLanguage } from '@/i18n';
import { getWordProgress, MASTERED_REPETITION_COUNT, resetWordProgress, type UserProgress } from '@/db/progress';
import { markWordKnown } from '@/db/study';
import { getWordWithTranslation, type DictionaryWord } from '@/db/words';
import { useTheme } from '@/hooks/use-theme';

export default function WordScreen() {
  const { word } = useLocalSearchParams<{ word?: string }>();
  const router = useRouter();
  const { translationLanguage, t } = useLanguage();
  const theme = useTheme();
  const [entry, setEntry] = useState<DictionaryWord | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    if (!word) return;
    setLoading(true);
    const [wordEntry, wordProgress] = await Promise.all([
      getWordWithTranslation(word, translationLanguage),
      getWordProgress(word),
    ]);
    setEntry(wordEntry);
    setProgress(wordProgress);
    setLoading(false);
  }, [translationLanguage, word]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const update = async (action: () => Promise<void>) => {
    setUpdating(true);
    try {
      await action();
      await load();
    } finally {
      setUpdating(false);
    }
  };

  const remaining = progress?.status === 'learning'
    ? Math.max(0, MASTERED_REPETITION_COUNT - progress.repetitions)
    : 0;
  const isLearning = progress?.status === 'learning';
  const isKnown = progress?.status === 'known' || progress?.status === 'mastered';
  const canReset = Boolean(progress) && !updating;
  const canMarkKnown = !isKnown && !updating;

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.scroll}>
      <ThemedView style={styles.content}>
        <DetailHeader title={entry?.word ?? word ?? ''} subtitle={t('dictionaries.wordDetails')} onBack={() => router.back()} />
        {loading && <ActivityIndicator color={theme.accent} />}
        {!loading && entry && <>
          <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
            <ThemedText type="title" style={styles.capitalize}>{entry.word}</ThemedText>
            <ThemedText type="subtitle" themeColor="textSecondary">{entry.translation}</ThemedText>
          </ThemedView>
          <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
            <ThemedText type="smallBold">{t('dictionaries.learningProgress')}</ThemedText>
            <ThemedText themeColor="textSecondary">
              {!progress
                ? t('dictionaries.notStarted')
                : progress.status === 'known'
                  ? t('dictionaries.alreadyKnown')
                  : progress.status === 'mastered'
                    ? t('dictionaries.mastered')
                    : `${t('dictionaries.repetitionsLeftPrefix')} ${remaining} ${t('dictionaries.repetitionsRemaining')}`}
            </ThemedText>
            {isLearning && (
              <View style={[styles.track, { backgroundColor: theme.border }]}> 
                <View style={[styles.fill, { backgroundColor: theme.primary, width: `${((progress.repetitions ?? 0) / MASTERED_REPETITION_COUNT) * 100}%` }]} />
              </View>
            )}
          </ThemedView>
          <View style={styles.actions}>
            <Pressable
              accessibilityState={{ disabled: !canReset }}
              disabled={!canReset}
              onPress={() => void update(() => resetWordProgress(entry.word))}
              style={[styles.action, { borderColor: theme.border }, !canReset && styles.disabledAction]}>
              <ThemedText type="smallBold" themeColor="textSecondary">{t('dictionaries.resetProgress')}</ThemedText>
            </Pressable>
            <Pressable
              accessibilityState={{ disabled: !canMarkKnown }}
              disabled={!canMarkKnown}
              onPress={() => void update(() => markWordKnown(entry.word))}
              style={[
                styles.action,
                isKnown
                  ? { backgroundColor: theme.backgroundSelected, borderColor: theme.border }
                  : { backgroundColor: theme.primary },
              ]}>
              <View style={styles.knownActionContent}>
                {isKnown && <MaterialCommunityIcons name="check" size={18} color={theme.accent} />}
                <ThemedText type="smallBold" themeColor={isKnown ? 'accent' : 'onPrimary'}>
                  {isKnown
                    ? progress?.status === 'mastered'
                      ? t('dictionaries.mastered')
                      : t('dictionaries.alreadyKnown')
                    : t('dictionaries.markKnown')}
                </ThemedText>
              </View>
            </Pressable>
          </View>
        </>}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 }, content: { maxWidth: MaxContentWidth, flexGrow: 1, width: '100%', alignSelf: 'center', padding: Spacing.three, gap: Spacing.three },
  card: { gap: Spacing.two, padding: Spacing.four, borderRadius: Spacing.three, borderWidth: 1 },
  capitalize: { textTransform: 'capitalize' }, track: { height: 8, overflow: 'hidden', borderRadius: 4 }, fill: { height: '100%', borderRadius: 4 },
  actions: { flexDirection: 'row', gap: Spacing.two }, action: { flex: 1, minHeight: 48, paddingHorizontal: Spacing.two, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  disabledAction: { opacity: 0.4 }, knownActionContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
});
