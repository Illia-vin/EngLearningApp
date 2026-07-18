import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Speech from 'expo-speech';

import { DetailHeader } from '@/components/detail-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useLanguage } from '@/i18n';
import { getWordProgress, MASTERED_REPETITION_COUNT, resetWordProgress, type UserProgress } from '@/db/progress';
import { markWordKnown } from '@/db/study';
import { getWord, type DictionaryWord } from '@/db/words';
import { useTheme } from '@/hooks/use-theme';

export default function WordScreen() {
  const { word } = useLocalSearchParams<{ word?: string }>();
  const wordId = Number(word);
  const router = useRouter();
  const { englishVariant, locale, translationLanguage, t } = useLanguage();
  const theme = useTheme();
  const [entry, setEntry] = useState<DictionaryWord | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const load = useCallback(async (showLoading = true) => {
    if (!Number.isSafeInteger(wordId)) return;
    if (showLoading) setLoading(true);
    try {
      const [wordEntry, wordProgress] = await Promise.all([
        getWord(wordId, translationLanguage, locale),
        getWordProgress(wordId),
      ]);
      setEntry(wordEntry);
      setProgress(wordProgress);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [locale, translationLanguage, wordId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const update = async (action: () => Promise<void>) => {
    setUpdating(true);
    try {
      await action();
      await load(false);
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
  const speechLanguage = englishVariant === 'american' ? 'en-US' : 'en-GB';

  useEffect(() => () => {
    void Speech.stop();
  }, []);

  const speakWord = () => {
    if (!entry) return;
    if (isSpeaking) {
      void Speech.stop();
      setIsSpeaking(false);
      return;
    }
    void Speech.stop();
    setIsSpeaking(true);
    Speech.speak(entry.word, {
      language: speechLanguage,
      rate: 0.85,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.scroll}>
      <ThemedView style={styles.content}>
        <DetailHeader title={t('dictionaries.wordDetails')} subtitle={entry?.word ?? word ?? ''} onBack={() => router.back()} />
        {loading && <ActivityIndicator color={theme.accent} />}
        {!loading && entry && <>
          <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
            <View style={styles.wordOverview}>
              <View style={styles.wordTitleRow}>
                <ThemedText type="title" style={styles.capitalize}>{entry.word}</ThemedText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Pronounce ${entry.word}`}
                  accessibilityState={{ selected: isSpeaking }}
                  onPress={speakWord}
                  style={[styles.speechButton, { backgroundColor: theme.backgroundSelected, borderColor: theme.border }]}>
                  <MaterialCommunityIcons name={isSpeaking ? 'stop' : 'volume-high'} size={22} color={theme.accent} />
                </Pressable>
              </View>
              <View style={[styles.typeBadge, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="smallBold" themeColor="accent">{entry.type}</ThemedText>
              </View>
              <ThemedText type="default" themeColor="textSecondary" style={styles.transcription}>
                {englishVariant === 'american' ? entry.phon_n_am : entry.phon_br}
              </ThemedText>
            </View>
            <View style={[styles.translationBlock, { borderColor: theme.border }]}>
              <ThemedText type="subtitle">{entry.translation}</ThemedText>
            </View>
            <View style={styles.definitionBlock}>
              <ThemedText type="smallBold">{entry.definition}</ThemedText>
              <View style={styles.exampleRow}>
                <MaterialCommunityIcons name="format-quote-open" size={20} color={theme.textSecondary} />
                <ThemedText type="small" themeColor="textSecondary" style={styles.exampleText}>{entry.example}</ThemedText>
              </View>
            </View>
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
              onPress={() => void update(() => resetWordProgress(entry.id))}
              style={[styles.action, { borderColor: theme.border }, !canReset && styles.disabledAction]}>
              <ThemedText type="smallBold" themeColor="textSecondary">{t('dictionaries.resetProgress')}</ThemedText>
            </Pressable>
            <Pressable
              accessibilityState={{ disabled: !canMarkKnown }}
              disabled={!canMarkKnown}
              onPress={() => void update(() => markWordKnown(entry.id))}
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
  card: { gap: Spacing.three, padding: Spacing.four, borderRadius: Spacing.three, borderWidth: 1 },
  capitalize: { textTransform: 'capitalize' }, track: { height: 8, overflow: 'hidden', borderRadius: 4 }, fill: { height: '100%', borderRadius: 4 },
  wordOverview: { alignItems: 'center', gap: Spacing.two },
  wordTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  speechButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  transcription: { fontFamily: Fonts.sans, fontSize: 20, lineHeight: 36, fontWeight: '400', includeFontPadding: true, paddingHorizontal: Spacing.one, paddingVertical: Spacing.half, textAlign: 'center' },
  typeBadge: { borderRadius: 999, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one },
  translationBlock: { alignItems: 'center', paddingVertical: Spacing.two, paddingHorizontal: Spacing.three, borderWidth: 1, borderRadius: Spacing.three },
  definitionBlock: { gap: Spacing.two },
  exampleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.one },
  exampleText: { flex: 1, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: Spacing.two }, action: { flex: 1, minHeight: 48, paddingHorizontal: Spacing.two, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  disabledAction: { opacity: 0.4 }, knownActionContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
});
