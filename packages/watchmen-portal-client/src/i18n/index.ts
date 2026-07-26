import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import zh from './locales/zh';

/**
 * localStorage key under which the user's language choice is persisted.
 * Per-client key (see sibling clients) so it does not bleed across apps.
 */
export const I18N_LANGUAGE_STORAGE_KEY = 'watchmen_portal_client_language';

void i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources: {
			en: { translation: en },
			zh: { translation: zh },
		},
		fallbackLng: 'en',
		supportedLngs: ['en', 'zh'],
		interpolation: {
			escapeValue: false,
		},
		// Prefer a previously stored choice, then fall back to the browser
		// language so first-time visitors still get a sensible default.
		detection: {
			order: ['localStorage', 'navigator'],
			lookupLocalStorage: I18N_LANGUAGE_STORAGE_KEY,
			caches: ['localStorage'],
		},
	});

document.documentElement.lang = i18n.resolvedLanguage ?? 'en';

i18n.on('languageChanged', (language) => {
	document.documentElement.lang = language;
});

export default i18n;
