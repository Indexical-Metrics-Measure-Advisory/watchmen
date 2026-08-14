import { useTranslation } from 'react-i18next';
import { useLocale, type AppLanguage } from '@/i18n/hooks/use-locale';

/**
 * Compact language switcher (EN / 中). Mirrors the native <select> pattern
 * used by the sibling Vite clients. Persists the choice via useLocale.
 */
export function LanguageSwitcher() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLocale();

  return (
    <select
      value={language}
      onChange={(e) => void setLanguage(e.target.value as AppLanguage)}
      aria-label={t('common.selectLanguage')}
      title={t('common.selectLanguage')}
      className="h-8 rounded-md border border-border bg-background px-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <option value="en">EN</option>
      <option value="zh">中</option>
      <option value="zh-TW">繁</option>
    </select>
  );
}
