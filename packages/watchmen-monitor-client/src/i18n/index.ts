import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import { defaultLanguage, resources } from './resources';

export const I18N_LANGUAGE_STORAGE_KEY = 'watchmen_monitor_client_language';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: defaultLanguage,
    supportedLngs: Object.keys(resources),
    defaultNS: 'common',
    ns: ['common', 'nav', 'auth', 'monitor', 'pipeline', 'datasource'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: I18N_LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
  });

document.documentElement.lang = i18n.resolvedLanguage ?? defaultLanguage;

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language;
});

export default i18n;
