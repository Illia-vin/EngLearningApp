import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getStudySnapshot,
  markWordKnown,
  reviewWord,
  startLearningWord,
  type StudySnapshot,
} from '@/db/study';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useLanguage } from '@/i18n';

type StudyMode = 'review' | 'new';

const EMPTY_SNAPSHOT: StudySnapshot = {
  dueWords: [],
  newWords: [],
  enabledDictionaryCount: 0,
  learningCount: 0,
  nextReviewAt: null,
};

export default function WordsScreen() {
  const [snapshot, setSnapshot] = useState<StudySnapshot>(EMPTY_SNAPSHOT);
  const [activeMode, setActiveMode] = useState<StudyMode | null>(null);
  const [translationVisible, setTranslationVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { locale, t } = useLanguage();

  const reload = useCallback(async () => {
    setError(null);
    try {
      setSnapshot(await getStudySnapshot());
      setTranslationVisible(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('words.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const performAction = async (action: () => Promise<void>) => {
    setProcessing(true);
    setError(null);
    try {
      await action();
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('words.error'));
    } finally {
      setProcessing(false);
    }
  };

  const currentNewWord = snapshot.newWords[0];
  const currentReviewWord = snapshot.dueWords[0];
  const nextReviewText = snapshot.nextReviewAt
    ? new Date(snapshot.nextReviewAt * 1000).toLocaleString(locale)
    : null;

  const contentInset = {
    top: insets.top,
    left: insets.left,
    right: insets.right,
    bottom: insets.bottom + BottomTabInset + Spacing.three,
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentInset={contentInset}
      contentContainerStyle={styles.contentContainer}>
      <ThemedView style={styles.container}>
        <View style={styles.titleRow}>
          {activeMode && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              onPress={() => setActiveMode(null)}
              style={styles.iconButton}>
              <MaterialCommunityIcons name="arrow-left" size={26} color={theme.text} />
            </Pressable>
          )}
          <ThemedText type={activeMode ? 'subtitle' : 'title'} style={styles.flexText}>
            {activeMode === 'review'
              ? t('words.review.title')
              : activeMode === 'new'
                ? t('words.new.title')
                : t('words.title')}
          </ThemedText>
        </View>

        {loading && <ActivityIndicator size="large" color={theme.textSecondary} />}
        {error && <ThemedText themeColor="textSecondary">{error}</ThemedText>}

        {!loading && !activeMode && (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              {t('words.chooseMode')}
            </ThemedText>

            <ModeCard
              icon="history"
              title={t('words.review.title')}
              description={
                snapshot.dueWords.length > 0
                  ? t('words.review.available')
                  : snapshot.learningCount === 0
                    ? t('words.review.noLearningWords')
                    : `${t('words.review.nothingDue')}${nextReviewText ? ` ${nextReviewText}` : ''}`
              }
              count={snapshot.dueWords.length}
              disabled={snapshot.dueWords.length === 0}
              onPress={() => setActiveMode('review')}
            />

            <ModeCard
              icon="school-outline"
              title={t('words.new.title')}
              description={
                snapshot.enabledDictionaryCount === 0
                  ? t('words.new.noDictionaries')
                  : snapshot.newWords.length === 0
                    ? t('words.new.empty')
                    : t('words.new.description')
              }
              count={snapshot.newWords.length}
              disabled={snapshot.newWords.length === 0}
              onPress={() => setActiveMode('new')}
            />
          </>
        )}

        {!loading && activeMode === 'new' && (
          currentNewWord ? (
            <ThemedView type="backgroundElement" style={styles.studyCard}>
              <ThemedText type="small" themeColor="textSecondary">
                {t('words.new.remaining')}: {snapshot.newWords.length}
              </ThemedText>
              <ThemedText type="title" style={styles.word}>{currentNewWord.word}</ThemedText>
              <ThemedText type="subtitle" themeColor="textSecondary">
                {currentNewWord.translation}
              </ThemedText>

              <View style={styles.actions}>
                <ActionButton
                  label={t('words.new.known')}
                  disabled={processing}
                  variant="secondary"
                  onPress={() => void performAction(() => markWordKnown(currentNewWord.word))}
                />
                <ActionButton
                  label={t('words.new.startLearning')}
                  disabled={processing}
                  variant="primary"
                  onPress={() => void performAction(() => startLearningWord(currentNewWord.word))}
                />
              </View>
            </ThemedView>
          ) : (
            <EmptyState
              icon="check-circle-outline"
              title={t('words.new.complete')}
              description={t('words.new.empty')}
            />
          )
        )}

        {!loading && activeMode === 'review' && (
          currentReviewWord ? (
            <ThemedView type="backgroundElement" style={styles.studyCard}>
              <ThemedText type="small" themeColor="textSecondary">
                {t('words.review.remaining')}: {snapshot.dueWords.length}
              </ThemedText>
              <ThemedText type="title" style={styles.word}>{currentReviewWord.word}</ThemedText>

              {!translationVisible ? (
                <ActionButton
                  label={t('words.review.showTranslation')}
                  disabled={processing}
                  variant="secondary"
                  onPress={() => setTranslationVisible(true)}
                />
              ) : (
                <>
                  <ThemedText type="subtitle" themeColor="textSecondary">
                    {currentReviewWord.translation}
                  </ThemedText>
                  <View style={styles.actions}>
                    <ActionButton
                      label={t('words.review.again')}
                      disabled={processing}
                      variant="secondary"
                      onPress={() => void performAction(() => reviewWord(currentReviewWord.word, 'again'))}
                    />
                    <ActionButton
                      label={t('words.review.remembered')}
                      disabled={processing}
                      variant="primary"
                      onPress={() => void performAction(() => reviewWord(currentReviewWord.word, 'remembered'))}
                    />
                  </View>
                </>
              )}
            </ThemedView>
          ) : (
            <EmptyState
              icon="check-circle-outline"
              title={t('words.review.complete')}
              description={t('words.review.nothingDue')}
            />
          )
        )}
      </ThemedView>
    </ScrollView>
  );
}

function ModeCard({
  icon,
  title,
  description,
  count,
  disabled,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
  count: number;
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeCard,
        { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
        disabled && styles.disabled,
      ]}>
      <View style={[styles.modeIcon, { backgroundColor: theme.background }]}>
        <MaterialCommunityIcons name={icon} size={30} color={theme.text} />
      </View>
      <View style={styles.modeText}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{description}</ThemedText>
      </View>
      <View style={[styles.countBadge, { backgroundColor: theme.background }]}>
        <ThemedText type="smallBold">{count}</ThemedText>
      </View>
    </Pressable>
  );
}

function ActionButton({
  label,
  disabled,
  variant,
  onPress,
}: {
  label: string;
  disabled: boolean;
  variant: 'primary' | 'secondary';
  onPress: () => void;
}) {
  const theme = useTheme();
  const backgroundColor = variant === 'primary' ? '#3C87F7' : theme.backgroundSelected;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        { backgroundColor, opacity: disabled ? 0.5 : pressed ? 0.75 : 1 },
      ]}>
      <ThemedText type="smallBold" style={variant === 'primary' && styles.primaryButtonText}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function EmptyState({ icon, title, description }: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
}) {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={styles.emptyState}>
      <MaterialCommunityIcons name={icon} size={48} color={theme.textSecondary} />
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">{description}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    gap: Spacing.four,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flexText: {
    flex: 1,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeCard: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 112,
  },
  disabled: {
    opacity: 0.45,
  },
  modeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeText: {
    flex: 1,
    gap: Spacing.one,
  },
  countBadge: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: Spacing.two,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studyCard: {
    minHeight: 420,
    borderRadius: Spacing.four,
    padding: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
  },
  word: {
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  actions: {
    width: '100%',
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  actionButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
  emptyState: {
    minHeight: 260,
    padding: Spacing.five,
    borderRadius: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
});
