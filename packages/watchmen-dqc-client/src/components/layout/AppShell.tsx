import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
	BarChart3,
	BookOpen,
	HeartPulse,
	LayoutDashboard,
	ListChecks,
	Lock,
	LogOut,
	ShieldCheck,
	TableProperties,
} from 'lucide-react';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/i18n/hooks/use-locale';
import { isPiiEnabled } from '@/utils/utils';
import { cn } from '@/lib/utils';

interface NavItem {
	path: string;
	labelKey: string;
	titleKey: string;
	subtitleKey: string;
	icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
	{ path: '/', labelKey: 'overview', titleKey: 'overview', subtitleKey: 'overviewSubtitle', icon: LayoutDashboard },
	{ path: '/rules', labelKey: 'rules', titleKey: 'rules', subtitleKey: 'rulesSubtitle', icon: ListChecks },
	{ path: '/results', labelKey: 'results', titleKey: 'results', subtitleKey: 'resultsSubtitle', icon: BarChart3 },
	{ path: '/catalog', labelKey: 'catalog', titleKey: 'catalog', subtitleKey: 'catalogSubtitle', icon: BookOpen },
	{ path: '/health', labelKey: 'health', titleKey: 'health', subtitleKey: 'healthSubtitle', icon: HeartPulse },
	{ path: '/profile', labelKey: 'profile', titleKey: 'profile', subtitleKey: 'profileSubtitle', icon: TableProperties },
];

const PII_NAV_ITEM: NavItem = {
	path: '/pii', labelKey: 'pii', titleKey: 'pii', subtitleKey: 'piiSubtitle', icon: ShieldCheck,
};

/** Derive page title/subtitle from the current pathname. */
const usePageTitle = () => {
	const location = useLocation();
	const { t } = useTranslation('nav');
	const items = [...NAV_ITEMS, PII_NAV_ITEM];
	// longest prefix match so "/" doesn't swallow everything
	const match = items
		.filter((item) => (item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)))
		.sort((a, b) => b.path.length - a.path.length)[0];
	if (!match) return { title: t('notFound'), subtitle: '' };
	return { title: t(match.titleKey), subtitle: t(match.subtitleKey) };
};

const AppShell: React.FC = () => {
	const { user, logout } = useAuth();
	const { t } = useTranslation(['common', 'nav']);
	const { language, setLanguage } = useLocale();
	const { title, subtitle } = usePageTitle();

	const getUserAvatar = (name: string) =>
		name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

	return (
		<TooltipProvider>
			<Sonner theme="dark" />
			<div className="min-h-screen flex w-full bg-background">
				{/* Sidebar */}
				<aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
					<div className="flex items-center gap-2.5 px-4 py-4">
						<div className="logo-dot grid h-8 w-8 place-items-center rounded-lg text-white">
							<Lock className="h-4 w-4" />
						</div>
						<div className="flex flex-col">
							<span className="text-sm font-bold text-sidebar-accent-foreground">{t('nav:brand')}</span>
							<span className="text-[11px] text-sidebar-foreground">{t('nav:brandSubtitle')}</span>
						</div>
					</div>
					<Separator className="bg-sidebar-border" />
					<div className="px-4 pb-1 pt-3 text-[10px] font-semibold tracking-wider text-sidebar-foreground">
						{t('nav:sectionQuality')}
					</div>
					<nav className="flex flex-col gap-0.5 px-2">
						{NAV_ITEMS.map((item) => (
							<NavLink
								key={item.path}
								to={item.path}
								end={item.path === '/'}
								className={({ isActive }) =>
									cn(
										'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors',
										isActive
											? 'bg-sidebar-accent text-sidebar-primary font-medium'
											: 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
									)
								}
							>
								<item.icon className="h-4 w-4 shrink-0" />
								<span>{t(`nav:${item.labelKey}`)}</span>
							</NavLink>
						))}
					</nav>
					{isPiiEnabled() && (
						<>
							<div className="px-4 pb-1 pt-3 text-[10px] font-semibold tracking-wider text-sidebar-foreground">
								{t('nav:sectionCompliance')}
							</div>
							<nav className="flex flex-col gap-0.5 px-2">
								<NavLink
									to={PII_NAV_ITEM.path}
									className={({ isActive }) =>
										cn(
											'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors',
											isActive
												? 'bg-sidebar-accent text-sidebar-primary font-medium'
												: 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
										)
									}
								>
									<PII_NAV_ITEM.icon className="h-4 w-4 shrink-0" />
									<span>{t(`nav:${PII_NAV_ITEM.labelKey}`)}</span>
								</NavLink>
							</nav>
						</>
					)}
				</aside>

				{/* Main */}
				<main className="flex min-w-0 flex-1 flex-col">
					<div className="sticky top-0 z-40 border-b bg-background/95 px-6 py-2.5 backdrop-blur">
						<div className="flex items-center justify-between gap-4">
							<div className="flex flex-col">
								<span className="text-base font-semibold leading-none">{title}</span>
								{subtitle && <span className="mt-0.5 text-xs text-muted-foreground">{subtitle}</span>}
							</div>
							<div className="flex items-center gap-2">
								<select
									value={language}
									onChange={(e) => void setLanguage(e.target.value as 'en' | 'zh-CN')}
									className="h-8 rounded-md border bg-background px-1.5 text-xs text-foreground"
									aria-label={t('common:selectLanguage')}
								>
									<option value="en">EN</option>
									<option value="zh-CN">中</option>
								</select>
								{user && (
									<>
										<div className="flex flex-col items-end">
											<span className="text-xs font-medium">{user.name}</span>
											<span className="text-[10px] text-muted-foreground">{user.role}</span>
										</div>
										<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
											{getUserAvatar(user.name)}
										</div>
										<Button variant="ghost" size="icon" className="h-8 w-8" onClick={logout} title={t('common:logout')}>
											<LogOut className="h-4 w-4" />
										</Button>
									</>
								)}
							</div>
						</div>
					</div>
					<div className="flex-1 overflow-auto p-6">
						<Outlet />
					</div>
				</main>
			</div>
		</TooltipProvider>
	);
};

export default AppShell;
