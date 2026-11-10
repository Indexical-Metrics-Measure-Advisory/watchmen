import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Bell, Boxes, CalendarRange, Clock3, DatabaseZap,
  GitBranch, LayoutDashboard, ListChecks, LogOut, Menu, Network, PanelLeftClose, Play,
  Search, Workflow, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTaskHub } from '@/context/TaskHubContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui';

const navItems = [
  { to: '/', label: '总览', icon: LayoutDashboard },
  { to: '/tasks', label: '任务', icon: ListChecks },
  { to: '/runs', label: '运行', icon: Play },
  { to: '/dependencies', label: '编排 DAG', icon: GitBranch },
  { to: '/map', label: '构建地图', icon: Network },
  { to: '/timeline', label: '时间线', icon: CalendarRange },
  { to: '/assets', label: '资产', icon: Boxes }
];

const pageTitles: Record<string, string> = {
  '/': '今日构建健康', '/tasks': '统一任务管理', '/runs': '统一运行台账',
  '/dependencies': '依赖编排', '/map': '数据构建地图', '/timeline': '构建时间线', '/assets': '资产构建视图'
};

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { notice, dismissNotice } = useTaskHub();
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();

  useEffect(() => setMobileOpen(false), [location.pathname]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(dismissNotice, 3500);
    return () => window.clearTimeout(timer);
  }, [notice, dismissNotice]);

  return (
    <div className="min-h-screen bg-background">
      {mobileOpen && <button className="fixed inset-0 z-40 bg-slate-950/30 md:hidden" onClick={() => setMobileOpen(false)} aria-label="关闭导航" />}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border/70 bg-sidebar transition-all duration-300',
        collapsed ? 'md:w-20' : 'md:w-60', 'w-60', mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}>
        <div className={cn('flex h-[72px] items-center gap-3 border-b border-border/60 px-4', collapsed && 'md:justify-center md:px-2')}>
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-md shadow-blue-200">
              <Workflow className="h-5 w-5" />
            </div>
            {!collapsed && <div className="min-w-0"><div className="truncate text-lg font-bold tracking-tight">Watchmen</div><div className="text-[11px] font-medium tracking-wide text-muted-foreground">UNIFIED TASK HUB</div></div>}
          </Link>
          <Button variant="ghost" size="icon" className="ml-auto md:hidden" onClick={() => setMobileOpen(false)}><X className="h-4 w-4" /></Button>
        </div>
        <div className={cn('px-3 pb-2 pt-5', collapsed && 'md:px-2')}>
          {!collapsed && <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">{t('工作空间')}</div>}
          <nav className="space-y-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === '/'} title={collapsed ? t(label) : undefined} className={({ isActive }) => cn(
                'group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                isActive && 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100',
                collapsed && 'md:justify-center md:px-0'
              )}>
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span>{t(label)}</span>}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="mt-auto p-3">
          {!collapsed && (
            <div className="mb-3 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-violet-50 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-800"><DatabaseZap className="h-4 w-4" />{t('构建视图已连接')}</div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">{t('{{count}} 个任务 · {{engines}} 类引擎', { count: 10, engines: 5 })}<br />processDate 2026-11-03</p>
            </div>
          )}
          <button onClick={() => setCollapsed((value) => !value)} className="hidden h-9 w-full items-center justify-center gap-2 rounded-lg text-xs text-slate-500 hover:bg-accent md:flex">
            <PanelLeftClose className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />{!collapsed && t('收起导航')}
          </button>
        </div>
      </aside>

      <div className={cn('min-h-screen transition-[padding] duration-300', collapsed ? 'md:pl-20' : 'md:pl-60')}>
        <header className="sticky top-0 z-30 flex h-[64px] items-center justify-between border-b border-border/60 bg-white/85 px-4 backdrop-blur-md md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></Button>
            <div className="min-w-0"><div className="truncate text-sm font-semibold text-slate-800">{location.pathname.startsWith('/tasks/') ? t('任务详情') : t(pageTitles[location.pathname] ?? 'Task Hub')}</div><div className="mt-0.5 hidden text-[11px] text-muted-foreground sm:block">{t('统一注册 · 统一编排 · 统一监控')}</div></div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-3">
            <Link to="/tasks" className="hidden h-8 items-center gap-2 rounded-md border bg-slate-50 px-3 text-xs text-muted-foreground hover:bg-accent sm:flex"><Search className="h-3.5 w-3.5" />{t('搜索任务或资产')}<kbd className="rounded border bg-white px-1 text-[10px]">⌘ K</kbd></Link>
            <select aria-label={t('语言')} value={i18n.language} onChange={(event) => void i18n.changeLanguage(event.target.value)} className="h-8 rounded-md border bg-white px-2 text-xs text-slate-600"><option value="zh-CN">简体中文</option><option value="en">English</option></select>
            <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 lg:inline-flex"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />{t(import.meta.env.VITE_TASKHUB_DATA_SOURCE === 'rest' ? 'REST API' : 'Mock 数据')}</span>
            <Link to="/" className="relative rounded-md p-2 text-slate-500 hover:bg-accent"><Bell className="h-[18px] w-[18px]" /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rose-500" /></Link>
            <div className="hidden h-6 w-px bg-border sm:block" />
            <button className="flex items-center gap-2 rounded-md p-1.5 hover:bg-accent" onClick={logout} title={t('退出登录')}><div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-xs font-semibold text-white">{user?.name.slice(0, 1)}</div><div className="hidden text-left lg:block"><div className="text-xs font-medium">{user?.name}</div><div className="text-[10px] text-muted-foreground">{user?.role}</div></div><LogOut className="h-3.5 w-3.5 text-slate-400" /></button>
          </div>
        </header>
        <main><Outlet /></main>
        <footer className="flex items-center justify-between border-t border-border/60 px-6 py-4 text-[11px] text-muted-foreground"><span>Watchmen Task Hub · UI Preview</span><span className="flex items-center gap-1"><Clock3 className="h-3 w-3" />{t('数据更新于 10:45:36')}</span></footer>
      </div>

      {notice && (
        <div className={cn('fixed bottom-5 right-5 z-[120] flex max-w-sm items-center gap-3 rounded-lg border bg-white px-4 py-3 text-sm shadow-xl', notice.tone === 'error' ? 'border-rose-200 text-rose-700' : notice.tone === 'success' ? 'border-emerald-200 text-emerald-700' : 'border-blue-200 text-blue-700')}>
          <span className="flex-1">{notice.message}</span><button onClick={dismissNotice}><X className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
}
