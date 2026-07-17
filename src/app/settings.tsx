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
        <View style={styles.header}>
          <ThemedText type="title">{t('settings.title')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('settings.description')}
          </ThemedText>
        </View>

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
    <View style={styles.dropdownSection}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.dropdownTrigger,
          {
            backgroundColor: pressed ? theme.backgroundSelected : theme.background,
            borderColor: open ? theme.primary : theme.border,
          },
        ]}>
        <ThemedText>{selectedLabel}</ThemedText>
        <MaterialCommunityIcons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={open ? theme.accent : theme.textSecondary}
        />
      </Pressable>

      {open && (
        <View
          style={[
            styles.dropdownMenu,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}>
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
                <ThemedText themeColor={selected ? 'accent' : 'textSecondary'}>
                  {option.label}
                </ThemedText>
                {selected && (
                  <MaterialCommunityIcons name="check" size={21} color={theme.accent} />
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
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
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.two,
  },
  dropdownSection: {
    gap: Spacing.two,
  },
  dropdownTrigger: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownMenu: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  dropdownOption: {
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
