import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/i18n/hooks/use-locale';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useRefreshInterval, refreshIntervalToMs } from '@/hooks/useRefreshInterval';
import { RefreshCw, LogOut } from 'lucide-react';

/** Derive page title/subtitle from the current pathname. */
const usePageTitle = () => {
  const location = useLocation();
  const { t } = useTranslation(['nav']);
  const path = location.pathname;
  if (path === '/') return { title: t('nav:overview'), subtitle: t('nav:overviewSubtitle') };
  if (path.startsWith('/ingestion')) return { title: t('nav:ingestion'), subtitle: t('nav:ingestionSubtitle') };
  if (path.startsWith('/pipeline')) return { title: t('nav:pipeline'), subtitle: t('nav:pipelineSubtitle') };
  if (path.startsWith('/datasource')) return { title: t('nav:datasource'), subtitle: t('nav:datasourceSubtitle') };
  return { title: 'Watchmen', subtitle: '' };
};

const TIME_RANGES = ['1h', '24h', '7d', '30d'] as const;

/**
 * Query-key prefixes invalidated on every auto/manual refresh. Keep in sync
 * with the prefixes declared in `src/hooks/useMonitorQueries.ts`.
 */
const REFRESH_QUERY_PREFIXES = ['ingest', 'pipeline', 'topics', 'datasource'] as const;

export type MonitorOutletContext = {
  timeRange: (typeof TIME_RANGES)[number];
  refreshKey: number;
  refresh: () => void;
  isRefreshing: boolean;
};

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation(['common', 'nav']);
  const { language, setLanguage } = useLocale();
  const { title, subtitle } = usePageTitle();
  const [timeRange, setTimeRange] = React.useState<(typeof TIME_RANGES)[number]>('24h');
  const [globalSearch, setGlobalSearch] = React.useState('');
  const queryClient = useQueryClient();
  const { interval: refreshInterval, setInterval: setRefreshInterval } = useRefreshInterval();
  const { refreshKey, refresh, isRefreshing } = useAutoRefresh(refreshIntervalToMs(refreshInterval));

  // Invalidate every monitor query prefix on each refresh tick so all visible
  // pages re-fetch through a single, central timer. Skip the initial mount
  // (refreshKey === 0) to avoid a redundant fetch right after hydration.
  React.useEffect(() => {
    if (refreshKey === 0) return;
    for (const prefix of REFRESH_QUERY_PREFIXES) {
      queryClient.invalidateQueries({ queryKey: [prefix] });
    }
  }, [refreshKey, queryClient]);

  const getUserAvatar = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <TooltipProvider>
      <Sonner />
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 flex flex-col">
            {/* Topbar */}
            <div className="sticky top-0 z-40 border-b bg-background px-6 py-2.5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <SidebarTrigger />
                  <div className="flex flex-col">
                    <span className="text-base font-semibold leading-none">{title}</span>
                    {subtitle && <span className="mt-0.5 text-xs text-muted-foreground">{subtitle}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    placeholder={t('common:search')}
                    className="h-8 w-56 text-sm"
                  />
                  {/* Time-range segmented control */}
                  <div className="flex items-center rounded-md border bg-muted/40 p-0.5">
                    {TIME_RANGES.map((r) => (
                      <button
                        key={r}
                        onClick={() => setTimeRange(r)}
                        className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                          timeRange === r ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={refresh}
                    title={t('common:refresh')}
                  >
                    <RefreshCw className={isRefreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                  </Button>
                  <select
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(e.target.value as typeof refreshInterval)}
                    className="h-8 rounded border bg-background px-1.5 text-xs"
                    aria-label={t('common:refreshInterval')}
                  >
                    <option value="1m">1m</option>
                    <option value="5m">5m</option>
                    <option value="10m">10m</option>
                    <option value="manual">{t('common:refreshIntervalManual')}</option>
                  </select>
                  {user && (
                    <>
                      <select
                        value={language}
                        onChange={(e) => void setLanguage(e.target.value as 'en' | 'zh-CN')}
                        className="h-8 rounded border bg-background px-1.5 text-xs"
                        aria-label={t('common:selectLanguage')}
                      >
                        <option value="en">EN</option>
                        <option value="zh-CN">中</option>
                      </select>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                        {getUserAvatar(user.name)}
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={logout} title={t('nav:logout')}>
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-gradient-to-b from-slate-50 to-slate-50/50 p-6">
              <Outlet context={{ timeRange, refreshKey, refresh, isRefreshing } as MonitorOutletContext} />
            </div>
          </main>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
};

export default Layout;

