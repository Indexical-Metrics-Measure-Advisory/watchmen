import { useTranslation } from 'react-i18next';

export type AppLanguage = 'en' | 'zh-CN';

/** Current language + setter persisted via i18next-browser-languagedetector. */
export const useLocale = () => {
	const { i18n } = useTranslation();
	const language = (i18n.resolvedLanguage ?? 'en') as AppLanguage;
	const setLanguage = async (lng: AppLanguage) => {
		await i18n.changeLanguage(lng);
	};
	return { language, setLanguage };
};
