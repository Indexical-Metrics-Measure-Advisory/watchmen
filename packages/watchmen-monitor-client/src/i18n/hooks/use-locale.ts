import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import i18n, { I18N_LANGUAGE_STORAGE_KEY } from '@/i18n';
import { AppLanguage, defaultLanguage } from '@/i18n/resources';

const isSupportedLanguage = (language: string): language is AppLanguage =>
  language === 'en' || language === 'zh-CN';

export const useLocale = () => {
  const { i18n: i18nInstance } = useTranslation();
  const language = isSupportedLanguage(i18nInstance.resolvedLanguage ?? '')
    ? i18nInstance.resolvedLanguage
    : defaultLanguage;

  const setLanguage = useCallback(async (nextLanguage: AppLanguage) => {
    localStorage.setItem(I18N_LANGUAGE_STORAGE_KEY, nextLanguage);
    await i18n.changeLanguage(nextLanguage);
  }, []);

  return {
    language,
    setLanguage,
    isEnglish: language === 'en',
  };
};
