import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useLanguage } from '@/i18n';
import {
  getDictionaries,
  type DictionarySummary,
} from '@/db/dictionaryRegistry';

export default function DictionariesScreen() {
  const [dictionaries, setDictionaries] = useState<DictionarySummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { locale, t } = useLanguage();

  const contentInset = {
    top: insets.top,
    left: insets.left,
    right: insets.right,
    bottom: insets.bottom + BottomTabInset + Spacing.three,
  };

  useEffect(() => {
    let active = true;

    setError(null);
    getDictionaries(locale)
      .then((result) => {
        if (active) setDictionaries(result);
      })
      .catch((caught) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : String(caught));
        }
      });

    return () => {
      active = false;
    };
  }, [locale]);

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

        {error && (
          <ThemedText type="small" themeColor="textSecondary">
            {error}
          </ThemedText>
        )}

        {!error && dictionaries.map((dictionary) => (
          <ThemedView
            key={dictionary.dictionary_key}
            type="backgroundElement"
            style={styles.dictionaryCard}>
            <ThemedText type="smallBold">{dictionary.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              EN → {dictionary.translation_languages.toUpperCase().replaceAll(',', ', ')} ·{' '}
              {dictionary.word_count}{' '}
              {t('dictionaries.words')} · {dictionary.list_count}{' '}
              {t('dictionaries.lists')}
            </ThemedText>
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
    gap: Spacing.one,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
});
