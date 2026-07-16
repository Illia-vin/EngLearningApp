import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { supportedLanguages, useLanguage, type LanguageCode } from '@/i18n';

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { locale, setLocale, t } = useLanguage();

  const handleSelectLanguage = (nextLocale: LanguageCode) => {
    setLocale(nextLocale);
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>      
      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          {t('settings.title')}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('settings.description')}
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.languageCard}>
          <ThemedText type="smallBold" style={styles.languageTitle}>
            {t('settings.languageLabel')}
          </ThemedText>

          {supportedLanguages.map((language) => {
            const isSelected = locale === language;
            const label = language === 'uk' ? 'Українська' : 'English';

            return (
              <Pressable
                key={language}
                onPress={() => handleSelectLanguage(language)}
                style={({ pressed }) => [styles.languageOption, pressed && styles.languageOptionPressed]}>
                <ThemedText type="small" themeColor={isSelected ? 'text' : 'textSecondary'}>
                  {label}
                </ThemedText>
                {isSelected ? (
                  <ThemedText type="smallBold">✓</ThemedText>
                ) : null}
              </Pressable>
            );
          })}
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
  },
  content: {
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  title: {
    marginBottom: Spacing.two,
  },
  languageCard: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    gap: Spacing.two,
  },
  languageTitle: {
    marginBottom: Spacing.one,
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
    borderRadius: Spacing.two,
  },
  languageOptionPressed: {
    opacity: 0.7,
  },
});
