import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import { en } from './resources';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'zh-CN': { translation: {} },
      en: { translation: en }
    },
    supportedLngs: ['zh-CN', 'en'],
    fallbackLng: 'zh-CN',
    load: 'currentOnly',
    returnEmptyString: false,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'taskhub-language',
      caches: ['localStorage']
    }
  });

export default i18n;
