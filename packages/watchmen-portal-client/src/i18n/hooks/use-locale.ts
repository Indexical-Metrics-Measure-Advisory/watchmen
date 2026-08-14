import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import i18n, { I18N_LANGUAGE_STORAGE_KEY } from '@/i18n';

export type AppLanguage = 'en' | 'zh' | 'zh-TW';

const isSupportedLanguage = (language: string): language is AppLanguage =>
	language === 'en' || language === 'zh' || language === 'zh-TW';

export const useLocale = () => {
	const { i18n: i18nInstance } = useTranslation();
	const language = isSupportedLanguage(i18nInstance.resolvedLanguage ?? '')
		? i18nInstance.resolvedLanguage
		: 'en';

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
