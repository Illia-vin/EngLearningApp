import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDefaultDictionaryWords, type DictionaryWord } from '@/db/words';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useLanguage } from '@/i18n';

export default function WordsScreen() {
  const [words, setWords] = useState<DictionaryWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  useEffect(() => {
    let active = true;

    async function loadWords() {
      try {
        const result = await getDefaultDictionaryWords();

        if (!active) return;
        setWords(result);
      } catch (caught) {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : t('words.error'));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadWords();

    return () => {
      active = false;
    };
  }, []);

  const contentInset = {
    top: insets.top,
    left: insets.left,
    right: insets.right,
    bottom: insets.bottom + BottomTabInset + Spacing.three,
  };

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={contentInset}
      contentContainerStyle={styles.contentContainer}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          {t('words.title')}
        </ThemedText>

        {loading && (
          <ThemedText type="small" themeColor="textSecondary">
            {t('words.loading')}
          </ThemedText>
        )}

        {!loading && error && (
          <ThemedText type="small" themeColor="textSecondary">
            {error}
          </ThemedText>
        )}

        {!loading && !error && words.length === 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            {t('words.empty')}
          </ThemedText>
        )}

        {!loading && !error && words.length > 0 && (
          <ThemedView type="backgroundElement" style={styles.wordsList}>
            {words.map((word) => (
              <ThemedView key={word.word} style={styles.wordCard} type="backgroundElement">
                <ThemedText type="smallBold" style={styles.wordText}>
                  {word.word}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {word.translation}
                </ThemedText>
              </ThemedView>
            ))}
          </ThemedView>
        )}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
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
  title: {
    marginBottom: Spacing.two,
  },
  wordsList: {
    gap: Spacing.two,
  },
  wordCard: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  wordText: {
    marginBottom: Spacing.one,
    textTransform: 'capitalize',
  },
});
