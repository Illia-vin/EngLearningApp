import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import {
  getCurrentLanguage,
  getCurrentTranslationLanguage,
  getCurrentEnglishVariant,
  setCurrentLanguage,
  setCurrentTranslationLanguage,
  setCurrentEnglishVariant,
  type StoredLanguage,
  type StoredTranslationLanguage,
  type StoredEnglishVariant,
} from '@/features/settings';

import en from './en.json';
import es from './es.json';
import uk from './uk.json';

export const supportedLanguages = ['uk', 'en', 'es'] as const;
export type LanguageCode = (typeof supportedLanguages)[number];
export const supportedTranslationLanguages = ['uk', 'es'] as const;
export type TranslationLanguageCode = (typeof supportedTranslationLanguages)[number];
export const supportedEnglishVariants = ['british', 'american'] as const;
export type EnglishVariant = (typeof supportedEnglishVariants)[number];

type TranslationValue = string | { [key: string]: TranslationValue };
type TranslationDictionary = typeof en;

interface LanguageContextValue {
  locale: LanguageCode;
  setLocale: (locale: LanguageCode) => void;
  translationLanguage: TranslationLanguageCode;
  setTranslationLanguage: (language: TranslationLanguageCode) => void;
  englishVariant: EnglishVariant;
  setEnglishVariant: (variant: EnglishVariant) => void;
  t: (key: string, fallback?: string) => string;
}

const translations: Record<LanguageCode, TranslationDictionary> = {
  uk,
  en,
  es,
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function getTranslationValue(dictionary: TranslationDictionary, key: string): string | undefined {
  const segments = key.split('.');
  let value: TranslationValue | undefined = dictionary as TranslationValue;

  for (const segment of segments) {
    if (typeof value === 'object' && value !== null && segment in value) {
      value = value[segment] as TranslationValue;
      continue;
    }

    return undefined;
  }

  return typeof value === 'string' ? value : undefined;
}

export function LanguageProvider({ children }: PropsWithChildren) {
  const [locale, setLocaleState] = useState<LanguageCode>('en');
  const [translationLanguage, setTranslationLanguageState] =
    useState<TranslationLanguageCode>('uk');
  const [englishVariant, setEnglishVariantState] = useState<EnglishVariant>('british');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    async function loadStoredLanguages() {
      try {
        const [storedLanguage, storedTranslationLanguage, storedEnglishVariant] = await Promise.all([
          getCurrentLanguage(),
          getCurrentTranslationLanguage(),
          getCurrentEnglishVariant(),
        ]);
        setLocaleState(storedLanguage as LanguageCode);
        setTranslationLanguageState(
          storedTranslationLanguage as TranslationLanguageCode,
        );
        setEnglishVariantState(storedEnglishVariant as EnglishVariant);
      } finally {
        setHydrated(true);
      }
    }

    void loadStoredLanguages();
  }, []);

  const setLocale = (nextLocale: LanguageCode) => {
    setLocaleState(nextLocale);
    void setCurrentLanguage(nextLocale as StoredLanguage);
  };

  const setTranslationLanguage = (nextLanguage: TranslationLanguageCode) => {
    setTranslationLanguageState(nextLanguage);
    void setCurrentTranslationLanguage(nextLanguage as StoredTranslationLanguage);
  };
  const setEnglishVariant = (nextVariant: EnglishVariant) => {
    setEnglishVariantState(nextVariant);
    void setCurrentEnglishVariant(nextVariant as StoredEnglishVariant);
  };

  const value = useMemo<LanguageContextValue>(() => ({
    locale,
    setLocale,
    translationLanguage,
    setTranslationLanguage,
    englishVariant,
    setEnglishVariant,
    t: (key: string, fallback?: string) => {
      const currentValue = getTranslationValue(translations[locale], key);
      if (currentValue) {
        return currentValue;
      }

      const fallbackValue = getTranslationValue(translations.en, key);
      return fallbackValue ?? fallback ?? key;
    },
  }), [englishVariant, locale, translationLanguage]);

  if (!hydrated) {
    return null;
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }

  return context;
}
