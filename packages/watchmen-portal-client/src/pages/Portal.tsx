import { useEffect, useMemo, useState } from 'react';
import { LogOut, PackageOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ModuleCard } from '@/components/ModuleCard';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { portalModules, hasModuleAccess } from '@/config/modules';
import { useAuth } from '@/context/AuthContext';
import { formatRelativeTime, loadLastAccessed, markAccessed } from '@/lib/lastAccessed';
import { checkAllModulesHealth, type ModuleHealthResult } from '@/lib/moduleHealth';
import { APP_TITLE, APP_TITLE_MONOGRAM } from '@/lib/appTitle';

export default function Portal() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [lastAccessed, setLastAccessed] = useState<Record<string, number>>(
    loadLastAccessed
  );
  const [healthMap, setHealthMap] = useState<Record<string, ModuleHealthResult>>(
    {}
  );

  // Filter modules by user role
  const userRole = user?.role ?? '';
  const visibleModules = useMemo(
    () => portalModules.filter((m) => hasModuleAccess(userRole, m)),
    [userRole]
  );

  // Dynamic counts based on visible modules
  const visibleAvailable = visibleModules.filter(
    (m) => m.status === 'available'
  ).length;
  const visibleComingSoon = visibleModules.filter(
    (m) => m.status === 'coming-soon'
  ).length;

  // Merge lastAccessed timestamps, then sort by most recently used first
  const modules = useMemo(
    () =>
      visibleModules
        .map((module) => ({
          ...module,
          lastAccessed: lastAccessed[module.id]
            ? formatRelativeTime(lastAccessed[module.id])
            : undefined,
        }))
        .sort((a, b) => {
          const aTime = lastAccessed[a.id] ?? 0;
          const bTime = lastAccessed[b.id] ?? 0;
          if (bTime !== aTime) return bTime - aTime;
          // Stable sort: preserve original order for modules with no access time
          return 0;
        }),
    [visibleModules, lastAccessed]
  );

  // Run health checks for all available modules on mount
  useEffect(() => {
    const available = visibleModules.filter((m) => m.status === 'available' && m.url);
    if (available.length === 0) return;

    checkAllModulesHealth(available).then(setHealthMap);
  }, [visibleModules]);

  const handleEnter = (moduleId: string) => {
    setLastAccessed(markAccessed(moduleId));
  };

  const displayName = user?.nickName || user?.name || '';
  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || '?';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="w-full border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center rounded-md bg-primary text-primary-foreground">
              <span className="text-base font-bold font-heading">{APP_TITLE_MONOGRAM}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-semibold text-foreground">
                {APP_TITLE}
              </span>
              <span className="text-xs text-muted-foreground">
                {t('common.dataPlatform')}
              </span>
            </div>
          </div>

          {/* User info */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-foreground">
                {displayName}
              </div>
              <div className="text-xs text-muted-foreground">{user?.role}</div>
            </div>
            <div className="w-9 h-9 flex items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="text-sm font-semibold">{avatarInitial}</span>
            </div>
            <LanguageSwitcher />
            <button
              type="button"
              onClick={logout}
              title={t('login.signOut')}
              aria-label={t('login.signOut')}
              className="w-9 h-9 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero / Welcome */}
      <section className="px-6 pt-14 pb-10 lg:pt-16 lg:pb-12">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <h1 className="text-3xl lg:text-4xl font-bold font-heading text-foreground leading-[1.2] tracking-tight">
              {t('portal.title')}
            </h1>
            <p className="mt-4 text-base lg:text-lg leading-relaxed text-muted-foreground max-w-2xl">
              {t('portal.subtitle')}
            </p>

            {/* Stats */}
            <div className="mt-8 flex items-center gap-6">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold tabular-nums font-heading text-primary">
                  {visibleAvailable}
                </span>
                <span className="text-sm text-muted-foreground">
                  {t('portal.availableModules')}
                </span>
              </div>
              {visibleComingSoon > 0 && (
                <>
                  <div className="w-px h-6 bg-border" />
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold tabular-nums font-heading text-muted-foreground">
                      {visibleComingSoon}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {t('portal.comingSoon')}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Module Card Grid */}
      <section className="px-6 pb-16 lg:pb-20 flex-1">
        <div className="mx-auto max-w-7xl">
          {modules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modules.map((module) => (
                <ModuleCard
                  key={module.id}
                  module={module}
                  onEnter={handleEnter}
                  health={healthMap[module.id]}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <PackageOpen className="h-12 w-12 text-muted-foreground" strokeWidth={1.5} />
              <p className="mt-4 text-base font-medium text-foreground">
                {t('module.noModules')}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('module.noModulesHint')}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-6 flex items-center justify-between">
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            {t('portal.copyright')}
          </span>
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            {t('portal.copyrightYear', { year: new Date().getFullYear() })}
          </span>
        </div>
      </footer>
    </div>
  );
}
