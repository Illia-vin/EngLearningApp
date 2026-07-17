import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import {
  supportedLanguages,
  supportedTranslationLanguages,
  useLanguage,
  type LanguageCode,
  type TranslationLanguageCode,
} from '@/i18n';

type OpenDropdown = 'interface' | 'translation' | null;

const languageLabels: Record<LanguageCode, string> = {
  uk: 'Українська',
  en: 'English',
  es: 'Español',
};

export default function SettingsScreen() {
  const [openDropdown, setOpenDropdown] = useState<OpenDropdown>(null);
  const theme = useTheme();
  const {
    locale,
    setLocale,
    translationLanguage,
    setTranslationLanguage,
    t,
  } = useLanguage();

  const interfaceOptions = supportedLanguages.map((language) => ({
    value: language,
    label: languageLabels[language],
  }));
  const translationOptions = supportedTranslationLanguages.map((language) => ({
    value: language,
    label: languageLabels[language],
  }));
  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.scrollContent}>
      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          {t('settings.title')}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('settings.description')}
        </ThemedText>

        <SettingsDropdown<LanguageCode>
          label={t('settings.interfaceLanguageLabel')}
          value={locale}
          options={interfaceOptions}
          open={openDropdown === 'interface'}
          onToggle={() =>
            setOpenDropdown((current) => current === 'interface' ? null : 'interface')
          }
          onSelect={(language) => {
            setLocale(language);
            setOpenDropdown(null);
          }}
        />

        <SettingsDropdown<TranslationLanguageCode>
          label={t('settings.translationLanguageLabel')}
          value={translationLanguage}
          options={translationOptions}
          open={openDropdown === 'translation'}
          onToggle={() =>
            setOpenDropdown((current) => current === 'translation' ? null : 'translation')
          }
          onSelect={(language) => {
            setTranslationLanguage(language);
            setOpenDropdown(null);
          }}
        />
      </ThemedView>
    </ScrollView>
  );
}

function SettingsDropdown<T extends string>({
  label,
  value,
  options,
  open,
  onToggle,
  onSelect,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  open: boolean;
  onToggle: () => void;
  onSelect: (value: T) => void;
}) {
  const theme = useTheme();
  const selectedLabel = options.find((option) => option.value === value)?.label ?? value;

  return (
    <ThemedView type="backgroundElement" style={styles.dropdownCard}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.dropdownTrigger,
          {
            backgroundColor: pressed ? theme.backgroundSelected : theme.background,
            borderColor: theme.backgroundSelected,
          },
        ]}>
        <ThemedText>{selectedLabel}</ThemedText>
        <MaterialCommunityIcons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={theme.textSecondary}
        />
      </Pressable>

      {open && (
        <View style={[styles.dropdownMenu, { backgroundColor: theme.background }]}>
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onSelect(option.value)}
                style={({ pressed }) => [
                  styles.dropdownOption,
                  (selected || pressed) && { backgroundColor: theme.backgroundSelected },
                ]}>
                <ThemedText themeColor={selected ? 'text' : 'textSecondary'}>
                  {option.label}
                </ThemedText>
                {selected && (
                  <MaterialCommunityIcons name="check" size={21} color={theme.text} />
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </ThemedView>
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
  dropdownCard: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    gap: Spacing.two,
  },
  dropdownTrigger: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownMenu: {
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  dropdownOption: {
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
