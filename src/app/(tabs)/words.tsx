import { type ReactNode, useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Speech from 'expo-speech';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Extrapolation,
} from 'react-native-reanimated';

import {
  getCachedStudySnapshot,
  getStudySnapshot,
  markWordKnown,
  reviewWord,
  startLearningWord,
  type StudySnapshot,
} from '@/db/study';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BackButton } from '@/components/back-button';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useLanguage } from '@/i18n';
import type { DictionaryWord } from '@/db/words';

type StudyMode = 'review' | 'new';

const EMPTY_SNAPSHOT: StudySnapshot = {
  dueWord: null,
  newWord: null,
  dueWordCount: 0,
  newWordCount: 0,
  enabledDictionaryCount: 0,
  learningCount: 0,
  nextReviewAt: null,
};

const SWIPE_THRESHOLD = 96;
const SWIPE_OUT_DISTANCE = Dimensions.get('window').width * 1.35;

export default function WordsScreen({ mode }: { mode?: StudyMode }) {
  const router = useRouter();
  const activeMode = mode ?? null;
  const theme = useTheme();
  const { englishVariant, locale, translationLanguage, t } = useLanguage();
  const initialSnapshot = getCachedStudySnapshot(translationLanguage, locale);
  const [snapshot, setSnapshot] = useState<StudySnapshot>(initialSnapshot ?? EMPTY_SNAPSHOT);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [loading, setLoading] = useState(!initialSnapshot);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (forceRefresh = activeMode === null) => {
    setError(null);
    try {
      setSnapshot(await getStudySnapshot(translationLanguage, locale, forceRefresh));
      setDetailsVisible(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('words.error'));
    } finally {
      setLoading(false);
    }
  }, [activeMode, locale, t, translationLanguage]);

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
      await reload(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('words.error'));
    } finally {
      setProcessing(false);
    }
  };

  const currentNewWord = snapshot.newWord;
  const currentReviewWord = snapshot.dueWord;
  const nextReviewText = snapshot.nextReviewAt
    ? new Date(snapshot.nextReviewAt * 1000).toLocaleString(locale)
    : null;

  return (
    <ScrollView
      scrollEnabled={!activeMode}
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[
        styles.contentContainer,
        activeMode && styles.activeContentContainer,
      ]}>
      <ThemedView style={[styles.container, activeMode && styles.activeContainer]}>
        <View style={styles.titleRow}>
          {activeMode && (
            <BackButton accessibilityLabel={t('common.back')} onPress={() => router.back()} />
          )}
          <View style={styles.titleText}>
            <ThemedText type={activeMode ? 'subtitle' : 'title'}>
              {activeMode === 'review'
                ? t('words.review.title')
                : activeMode === 'new'
                  ? t('words.new.title')
                  : t('words.title')}
            </ThemedText>
            {activeMode === 'new' && (
              <ThemedText type="small" themeColor="textSecondary" style={loading && styles.loadingSubtitle}>
                {loading ? '\u00A0' : `${t('words.new.remaining')}: ${snapshot.newWordCount}`}
              </ThemedText>
            )}
            {activeMode === 'review' && (
              <ThemedText type="small" themeColor="textSecondary" style={loading && styles.loadingSubtitle}>
                {loading ? '\u00A0' : `${t('words.review.remainingToReview', 'Words left to review')}: ${snapshot.dueWordCount}`}
              </ThemedText>
            )}
          </View>
        </View>

        {loading && !activeMode && <ActivityIndicator size="large" color={theme.textSecondary} />}
        {loading && activeMode && <StudyCardSkeleton />}
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
                snapshot.dueWordCount > 0
                  ? t('words.review.available')
                  : snapshot.learningCount === 0
                    ? t('words.review.noLearningWords')
                    : `${t('words.review.nothingDue')}${nextReviewText ? ` ${nextReviewText}` : ''}`
              }
              count={snapshot.dueWordCount}
              disabled={snapshot.dueWordCount === 0}
              onPress={() =>
                router.push({ pathname: '/study/[mode]', params: { mode: 'review' } })
              }
            />

            <ModeCard
              icon="school-outline"
              title={t('words.new.title')}
              description={
                snapshot.enabledDictionaryCount === 0
                  ? t('words.new.noDictionaries')
                  : snapshot.newWordCount === 0
                    ? t('words.new.empty')
                    : t('words.new.description')
              }
              count={snapshot.newWordCount}
              disabled={snapshot.newWordCount === 0}
              onPress={() =>
                router.push({ pathname: '/study/[mode]', params: { mode: 'new' } })
              }
            />
          </>
        )}

        {!loading && activeMode === 'new' && (
          currentNewWord ? (
            <SwipeStudyCard
              key={`new-${currentNewWord.id}`}
              disabled={processing}
              leftLabel={t('words.new.known')}
              rightLabel={t('words.new.startLearning')}
              onSwipeLeft={() =>
                void performAction(() => markWordKnown(currentNewWord.id))
              }
              onSwipeRight={() =>
                void performAction(() => startLearningWord(currentNewWord.id))
              }>
              <StudyWordCard
                word={currentNewWord}
                englishVariant={englishVariant}
                detailsVisible
              />
            </SwipeStudyCard>
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
            <SwipeStudyCard
              key={`review-${currentReviewWord.id}`}
              disabled={processing}
              leftLabel={t('words.review.again')}
              rightLabel={t('words.review.remembered')}
              onSwipeLeft={() =>
                void performAction(() => reviewWord(currentReviewWord.id, 'again'))
              }
              onSwipeRight={() =>
                void performAction(() => reviewWord(currentReviewWord.id, 'remembered'))
              }>
              <StudyWordCard
                word={currentReviewWord}
                englishVariant={englishVariant}
                detailsVisible={detailsVisible}
                onShowDetails={() => setDetailsVisible(true)}
                revealLabel={t('words.review.show', 'Show')}
                disabled={processing}
              />
            </SwipeStudyCard>
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

function SwipeStudyCard({
  children,
  disabled,
  leftLabel,
  rightLabel,
  onSwipeLeft,
  onSwipeRight,
}: {
  children: ReactNode;
  disabled: boolean;
  leftLabel: string;
  rightLabel: string;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}) {
  const theme = useTheme();
  const translateX = useSharedValue(0);
  const isCommitting = useSharedValue(false);
  const isDragging = useSharedValue(false);

  useEffect(() => {
    if (!disabled) {
      isCommitting.value = false;
      translateX.value = withSpring(0, { damping: 18, stiffness: 180 });
    }
  }, [disabled, isCommitting, translateX]);

  const animateManualSwipe = (direction: -1 | 1) => {
    if (disabled || isCommitting.value) {
      return;
    }

    isCommitting.value = true;
    translateX.value = withTiming(
      direction * SWIPE_OUT_DISTANCE,
      { duration: 220 },
      (finished) => {
        if (!finished) return;
        if (direction === -1) {
          runOnJS(onSwipeLeft)();
        } else {
          runOnJS(onSwipeRight)();
        }
      },
    );
  };

  const panGesture = Gesture.Pan()
    .enabled(!disabled)
    .activeOffsetX([-12, 12])
    .failOffsetY([-18, 18])
    .onStart(() => {
      isDragging.value = true;
    })
    .onUpdate((event) => {
      if (!isCommitting.value) {
        translateX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      const shouldCommit =
        Math.abs(event.translationX) >= SWIPE_THRESHOLD ||
        Math.abs(event.velocityX) >= 850;

      if (!shouldCommit) {
        translateX.value = withSpring(0, { damping: 18, stiffness: 180 });
        return;
      }

      const direction = event.translationX < 0 ? -1 : 1;
      isCommitting.value = true;
      translateX.value = withTiming(
        direction * SWIPE_OUT_DISTANCE,
        { duration: 220 },
        (finished) => {
          if (!finished) return;
          if (direction === -1) {
            runOnJS(onSwipeLeft)();
          } else {
            runOnJS(onSwipeRight)();
          }
        },
      );
    })
    .onFinalize(() => {
      isDragging.value = false;
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      {
        rotate: `${interpolate(
          translateX.value,
          [-SWIPE_OUT_DISTANCE, 0, SWIPE_OUT_DISTANCE],
          [-9, 0, 9],
          Extrapolation.CLAMP,
        )}deg`,
      },
    ],
  }));
  const leftHintStyle = useAnimatedStyle(() => ({
    opacity: isDragging.value
      ? interpolate(
          translateX.value,
          [-SWIPE_THRESHOLD, -24, 0],
          [1, 0.25, 0],
          Extrapolation.CLAMP,
        )
      : 0,
  }));
  const rightHintStyle = useAnimatedStyle(() => ({
    opacity: isDragging.value
      ? interpolate(
          translateX.value,
          [0, 24, SWIPE_THRESHOLD],
          [0, 0.25, 1],
          Extrapolation.CLAMP,
        )
      : 0,
  }));

  return (
    <View style={styles.swipeSection}>
      <View style={styles.cardDeck}>
        <View
          style={[
            styles.cardUnderlay,
            { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
          ]}
        />
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.swipeCard, cardStyle]}>
            {children}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.swipeHint,
                styles.leftSwipeHint,
                { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
                rightHintStyle,
              ]}>
              <MaterialCommunityIcons name="arrow-right" size={18} color={theme.accent} />
              <ThemedText type="smallBold" themeColor="accent">
                {rightLabel}
              </ThemedText>
            </Animated.View>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.swipeHint,
                styles.rightSwipeHint,
                { backgroundColor: theme.background, borderColor: theme.border },
                leftHintStyle,
              ]}>
              <MaterialCommunityIcons name="arrow-left" size={18} color={theme.textSecondary} />
              <ThemedText type="smallBold" themeColor="textSecondary">
                {leftLabel}
              </ThemedText>
            </Animated.View>
            <View style={styles.swipeActions}>
              <SwipeActionButton
                direction="left"
                label={leftLabel}
                disabled={disabled}
                variant="secondary"
                onPress={() => animateManualSwipe(-1)}
              />
              <SwipeActionButton
                direction="right"
                label={rightLabel}
                disabled={disabled}
                variant="primary"
                onPress={() => animateManualSwipe(1)}
              />
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
}

function StudyWordCard({
  word,
  englishVariant,
  remainingLabel,
  detailsVisible,
  revealLabel,
  disabled = false,
  onShowDetails,
}: {
  word: DictionaryWord;
  englishVariant: 'british' | 'american';
  remainingLabel?: string;
  detailsVisible: boolean;
  revealLabel?: string;
  disabled?: boolean;
  onShowDetails?: () => void;
}) {
  const theme = useTheme();
  const transcription = englishVariant === 'american' ? word.phon_n_am : word.phon_br;
  const compact = !detailsVisible && Boolean(onShowDetails);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechLanguage = englishVariant === 'american' ? 'en-US' : 'en-GB';

  useEffect(() => () => {
    void Speech.stop();
  }, []);

  const speakWord = () => {
    if (isSpeaking) {
      void Speech.stop();
      setIsSpeaking(false);
      return;
    }
    void Speech.stop();
    setIsSpeaking(true);
    Speech.speak(word.word, {
      language: speechLanguage,
      rate: 0.85,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  return (
    <ThemedView type="backgroundElement" style={[styles.studyCard, compact && styles.compactStudyCard, { borderColor: theme.border }]}>
      {remainingLabel && <ThemedText type="small" themeColor="textSecondary" style={styles.remainingText}>
        {remainingLabel}
      </ThemedText>}
      <View style={[styles.wordHeader, compact && styles.compactWordHeader]}>
        <View style={styles.wordTitleRow}>
          <ThemedText type="title" style={styles.word}>{word.word}</ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Pronounce ${word.word}`}
            accessibilityState={{ selected: isSpeaking }}
            onPress={speakWord}
            style={[styles.speechButton, { backgroundColor: theme.backgroundSelected, borderColor: theme.border }]}>
            <MaterialCommunityIcons
              name={isSpeaking ? 'stop' : 'volume-high'}
              size={22}
              color={theme.accent}
            />
          </Pressable>
        </View>
        <View
          style={[styles.typeBadge, { backgroundColor: theme.backgroundSelected }]}
        >
          <ThemedText type="smallBold" themeColor="accent">{word.type}</ThemedText>
        </View>
      </View>

      {detailsVisible ? (
        <View style={styles.wordDetails}>
          <ThemedText type="default" themeColor="textSecondary" style={styles.transcription}>
            {transcription}
          </ThemedText>
          <View style={[styles.translationBlock, { borderColor: theme.border }]}>
            <ThemedText type="subtitle">{word.translation}</ThemedText>
          </View>
          <View style={styles.definitionBlock}>
            <ThemedText type="smallBold">{word.definition}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.exampleText}>
              {word.example}
            </ThemedText>
          </View>
        </View>
      ) : onShowDetails && revealLabel ? (
        <RevealDetailsButton label={revealLabel} disabled={disabled} onPress={onShowDetails} />
      ) : null}
    </ThemedView>
  );
}

function StudyCardSkeleton() {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={[styles.studyCardSkeleton, { borderColor: theme.border }]}>
      <ActivityIndicator size="large" color={theme.textSecondary} />
    </ThemedView>
  );
}

function RevealDetailsButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
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
      style={[
        styles.revealButton,
        {
          backgroundColor: theme.backgroundSelected,
          borderColor: theme.border,
        },
        disabled && styles.disabled,
      ]}>
      <MaterialCommunityIcons name="eye-outline" size={21} color={theme.accent} />
      <ThemedText type="smallBold" themeColor="accent">
        {label}
      </ThemedText>
    </Pressable>
  );
}

function SwipeActionButton({
  direction,
  label,
  disabled,
  variant,
  onPress,
}: {
  direction: 'left' | 'right';
  label: string;
  disabled: boolean;
  variant: 'primary' | 'secondary';
  onPress: () => void;
}) {
  const theme = useTheme();
  const primary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.swipeActionButton,
        disabled && styles.disabled,
      ]}>
      <View
        style={[
          styles.swipeActionCircle,
          {
            backgroundColor: primary ? theme.primary : theme.background,
            borderColor: primary ? theme.primary : theme.border,
          },
        ]}>
        <MaterialCommunityIcons
          name={direction === 'left' ? 'arrow-left' : 'arrow-right'}
          size={27}
          color={primary ? theme.onPrimary : theme.textSecondary}
        />
      </View>
      <ThemedText
        type="smallBold"
        themeColor={primary ? 'accent' : 'textSecondary'}
        numberOfLines={2}
        style={styles.swipeActionLabel}>
        {label}
      </ThemedText>
    </Pressable>
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
      style={[
        styles.modeCard,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
        },
        disabled && styles.disabled,
      ]}>
      <View style={[styles.modeIcon, { backgroundColor: theme.backgroundSelected }]}>
        <MaterialCommunityIcons name={icon} size={30} color={theme.accent} />
      </View>
      <View style={styles.modeText}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{description}</ThemedText>
      </View>
      <View style={[styles.countBadge, { backgroundColor: theme.primary }]}>
        <ThemedText type="smallBold" themeColor="onPrimary">{count}</ThemedText>
      </View>
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
    <ThemedView
      type="backgroundElement"
      style={[styles.emptyState, { borderColor: theme.border }]}>
      <MaterialCommunityIcons name={icon} size={48} color={theme.accent} />
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">{description}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  activeContentContainer: {
    minHeight: '100%',
  },
  container: {
    maxWidth: MaxContentWidth,
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    gap: Spacing.three,
  },
  activeContainer: {
    paddingBottom: Spacing.three,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  titleText: {
    flex: 1,
    gap: Spacing.half,
  },
  loadingSubtitle: {
    opacity: 0,
  },
  modeCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 96,
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.45,
  },
  modeIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeText: {
    flex: 1,
    gap: Spacing.one,
  },
  countBadge: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: Spacing.two,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeSection: {
    flex: 1,
    width: '100%',
  },
  cardDeck: {
    flex: 1,
    position: 'relative',
    paddingBottom: Spacing.two,
  },
  cardUnderlay: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    bottom: 0,
    left: Spacing.two,
    borderRadius: 20,
    borderWidth: 1,
  },
  swipeCard: {
    flex: 1,
    zIndex: 1,
  },
  swipeHint: {
    position: 'absolute',
    top: Spacing.three,
    zIndex: 2,
    maxWidth: '48%',
    minHeight: 40,
    paddingHorizontal: Spacing.two,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  leftSwipeHint: {
    left: Spacing.three,
  },
  rightSwipeHint: {
    right: Spacing.three,
  },
  swipeActions: {
    position: 'absolute',
    right: Spacing.four,
    bottom: Spacing.three,
    left: Spacing.four,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    gap: Spacing.four,
  },
  swipeActionButton: {
    width: '44%',
    alignItems: 'center',
    gap: Spacing.two,
  },
  swipeActionCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeActionPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
  swipeActionLabel: {
    minHeight: 40,
    textAlign: 'center',
  },
  studyCard: {
    flex: 1,
    width: '100%',
    borderRadius: 20,
    padding: Spacing.four,
    paddingBottom: 132,
    borderWidth: 1,
  },
  studyCardSkeleton: {
    flex: 1,
    minHeight: 420,
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactStudyCard: {
    justifyContent: 'center',
  },
  remainingText: {
    alignSelf: 'flex-end',
  },
  wordHeader: {
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: 'auto',
    marginBottom: Spacing.four,
  },
  compactWordHeader: {
    marginTop: 0,
    marginBottom: Spacing.three,
  },
  word: {
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  wordTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  speechButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  wordDetails: {
    gap: Spacing.three,
    marginBottom: 'auto',
  },
  transcription: {
    textAlign: 'center',
    fontFamily: Fonts.sans,
    fontSize: 20,
    lineHeight: 36,
    fontWeight: '400',
    includeFontPadding: true,
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.half,
  },
  translationBlock: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.three,
  },
  definitionBlock: {
    gap: Spacing.two,
  },
  exampleText: {
    fontStyle: 'italic',
  },
  revealButton: {
    minHeight: 46,
    borderRadius: 23,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  emptyState: {
    minHeight: 220,
    padding: Spacing.four,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
  },
});
