import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { getCurrentLanguage, setCurrentLanguage, type StoredLanguage } from '@/features/settings';

import en from './en.json';
import uk from './uk.json';

export const supportedLanguages = ['uk', 'en'] as const;
export type LanguageCode = (typeof supportedLanguages)[number];

type TranslationValue = string | { [key: string]: TranslationValue };
type TranslationDictionary = typeof en;

interface LanguageContextValue {
  locale: LanguageCode;
  setLocale: (locale: LanguageCode) => void;
  t: (key: string, fallback?: string) => string;
}

const translations: Record<LanguageCode, TranslationDictionary> = {
  uk,
  en,
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

  useEffect(() => {
    async function loadStoredLanguage() {
      const storedLanguage = await getCurrentLanguage();
      setLocaleState(storedLanguage as LanguageCode);
    }

    void loadStoredLanguage();
  }, []);

  const setLocale = (nextLocale: LanguageCode) => {
    setLocaleState(nextLocale);
    void setCurrentLanguage(nextLocale as StoredLanguage);
  };

  const value = useMemo<LanguageContextValue>(() => ({
    locale,
    setLocale,
    t: (key: string, fallback?: string) => {
      const currentValue = getTranslationValue(translations[locale], key);
      if (currentValue) {
        return currentValue;
      }

      const fallbackValue = getTranslationValue(translations.en, key);
      return fallbackValue ?? fallback ?? key;
    },
  }), [locale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }

  return context;
}
