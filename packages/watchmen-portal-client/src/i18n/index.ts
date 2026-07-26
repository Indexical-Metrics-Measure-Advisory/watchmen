import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import zh from './locales/zh';

/**
 * Detect the user's preferred language from the browser.
 * Supports 'zh' (all Chinese variants) and falls back to 'en'.
 */
const detectLanguage = (): string => {
  const nav = navigator as { languages?: readonly string[]; language?: string };
  const lang = nav.languages?.[0] ?? nav.language ?? 'en';
  return lang.startsWith('zh') ? 'zh' : 'en';
};

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: detectLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;