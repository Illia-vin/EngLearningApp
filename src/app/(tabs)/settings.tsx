import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import {
  supportedEnglishVariants,
  supportedLanguages,
  supportedTranslationLanguages,
  useLanguage,
  type EnglishVariant,
  type LanguageCode,
  type TranslationLanguageCode,
} from '@/i18n';

type OpenDropdown = 'interface' | 'translation' | 'englishVariant' | null;

const nativeLanguageLabels: Record<LanguageCode, string> = {
  uk: 'Українська',
  en: 'English',
  es: 'Español',
};
const languageFlags: Record<LanguageCode, string> = {
  uk: '🇺🇦', en: '🇬🇧', es: '🇪🇸',
};
const translationLanguageLabels: Record<LanguageCode, Record<TranslationLanguageCode, string>> = {
  uk: { uk: 'Українська', es: 'Іспанська' },
  en: { uk: 'Ukrainian', es: 'Spanish' },
  es: { uk: 'Ucraniano', es: 'Español' },
};
const englishVariantLabels: Record<LanguageCode, Record<EnglishVariant, string>> = {
  uk: { british: 'Британський', american: 'Американський' },
  en: { british: 'British', american: 'American' },
  es: { british: 'Británico', american: 'Americano' },
};

export default function SettingsScreen() {
  const [openDropdown, setOpenDropdown] = useState<OpenDropdown>(null);
  const theme = useTheme();
  const { locale, setLocale, translationLanguage, setTranslationLanguage, englishVariant, setEnglishVariant, t } = useLanguage();
  const interfaceOptions = supportedLanguages.map((language) => ({ value: language, label: nativeLanguageLabels[language], flag: languageFlags[language] }));
  const translationOptions = supportedTranslationLanguages.map((language) => ({ value: language, label: translationLanguageLabels[locale][language], flag: languageFlags[language] }));
  const englishVariantOptions = supportedEnglishVariants.map((variant) => ({
    value: variant,
    label: englishVariantLabels[locale][variant],
    flag: variant === 'american' ? '🇺🇸' : languageFlags.en,
  }));

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.scrollContent}>
      <ThemedView style={styles.content}>
        <View style={styles.header}>
          <ThemedText type="title">{t('settings.title')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{t('settings.description')}</ThemedText>
        </View>

        <SettingsDropdown<EnglishVariant>
          label={t('settings.englishVariantLabel', 'English variant')}
          value={englishVariant} options={englishVariantOptions} open={openDropdown === 'englishVariant'}
          onToggle={() => setOpenDropdown((current) => current === 'englishVariant' ? null : 'englishVariant')}
          onSelect={(variant) => { setEnglishVariant(variant); setOpenDropdown(null); }}
        />
        <SettingsDropdown<TranslationLanguageCode>
          label={t('settings.translationLanguageLabel')}
          value={translationLanguage} options={translationOptions} open={openDropdown === 'translation'}
          onToggle={() => setOpenDropdown((current) => current === 'translation' ? null : 'translation')}
          onSelect={(language) => { setTranslationLanguage(language); setOpenDropdown(null); }}
        />
        <SettingsDropdown<LanguageCode>
          label={t('settings.interfaceLanguageLabel')}
          value={locale} options={interfaceOptions} open={openDropdown === 'interface'}
          onToggle={() => setOpenDropdown((current) => current === 'interface' ? null : 'interface')}
          onSelect={(language) => { setLocale(language); setOpenDropdown(null); }}
        />
      </ThemedView>
    </ScrollView>
  );
}

function SettingsDropdown<T extends string>({ label, value, options, open, onToggle, onSelect }: {
  label: string;
  value: T;
  options: readonly { value: T; label: string; flag?: string }[];
  open: boolean;
  onToggle: () => void;
  onSelect: (value: T) => void;
}) {
  const theme = useTheme();
  const selectedOption = options.find((option) => option.value === value);
  return (
    <View style={styles.dropdownSection}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onToggle}
        style={[styles.dropdownTrigger, { backgroundColor: theme.background, borderColor: open ? theme.primary : theme.border }]}>
        <OptionLabel flag={selectedOption?.flag} label={selectedOption?.label ?? value} />
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={24} color={open ? theme.accent : theme.textSecondary} />
      </Pressable>
      {open && <View style={[styles.dropdownMenu, { backgroundColor: theme.background, borderColor: theme.border }]}>
        {options.map((option) => {
          const selected = option.value === value;
          return <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => onSelect(option.value)}
            style={[styles.dropdownOption, selected && { backgroundColor: theme.backgroundSelected }]}>
            <OptionLabel flag={option.flag} label={option.label} themeColor={selected ? 'accent' : 'textSecondary'} />
            {selected && <MaterialCommunityIcons name="check" size={21} color={theme.accent} />}
          </Pressable>;
        })}
      </View>}
    </View>
  );
}

function OptionLabel({ flag, label, themeColor }: { flag?: string; label: string; themeColor?: 'accent' | 'textSecondary' }) {
  return <View style={styles.optionLabel}>
    {flag && <ThemedText style={styles.flag}>{flag}</ThemedText>}
    <ThemedText themeColor={themeColor}>{label}</ThemedText>
  </View>;
}

const styles = StyleSheet.create({
  scrollContent: { flexDirection: 'row', justifyContent: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.four },
  content: { maxWidth: MaxContentWidth, flexGrow: 1, gap: Spacing.four },
  header: { gap: Spacing.two },
  dropdownSection: { gap: Spacing.two },
  dropdownTrigger: { minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: Spacing.three, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownMenu: { borderRadius: 14, overflow: 'hidden', borderWidth: 1 },
  dropdownOption: { minHeight: 48, paddingHorizontal: Spacing.three, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionLabel: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flag: { fontSize: 19, lineHeight: 24 },
});
