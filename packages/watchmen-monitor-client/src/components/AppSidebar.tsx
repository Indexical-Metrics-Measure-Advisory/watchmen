import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { LayoutDashboard, Database, GitBranch, Table2, Bell, Share2, Settings, Activity } from 'lucide-react';
import { systemService } from '@/services/systemService';
import { useTranslation } from 'react-i18next';

interface NavItem {
  id: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

// Disabled items (Alerts/Global Map) are gated by env flags; Settings is a permanent placeholder.
const SHOW_ALERTS = (import.meta.env.VITE_SHOW_ALERTS ?? 'false') === 'true';
const SHOW_GLOBAL_MAP = (import.meta.env.VITE_SHOW_GLOBAL_MAP ?? 'true') === 'true';

const menuItems: NavItem[] = [
  { id: 'overview', url: '/', icon: LayoutDashboard },
  { id: 'ingestion', url: '/ingestion', icon: Database },
  { id: 'pipeline', url: '/pipeline', icon: GitBranch },
  { id: 'topics', url: '/topics', icon: Table2 },
  { id: 'alerts', url: '/alerts', icon: Bell, disabled: !SHOW_ALERTS },
  { id: 'globalMap', url: '/global-map', icon: Share2, disabled: !SHOW_GLOBAL_MAP },
  { id: 'settings', url: '/settings', icon: Settings, disabled: true },
];

export function AppSidebar() {
  const location = useLocation();
  const { t } = useTranslation(['nav', 'common']);
  const appTitle = import.meta.env.VITE_APP_TITLE ?? 'Watchmen Data Monitor';
  const [envTag, setEnvTag] = React.useState<string>('');

  React.useEffect(() => {
    systemService.fetchSystemEnv().then((tag) => {
      if (tag) setEnvTag(tag);
    });
  }, []);

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-blue-600 text-white">
            <Activity className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold leading-none">{appTitle}</span>
            <span className="text-xs font-medium text-muted-foreground">{t('nav:platform')}</span>
            {envTag && (
              <Badge
                variant="secondary"
                className="mt-1 h-4 w-fit rounded-sm px-1.5 py-0 text-[10px] uppercase text-white"
              >
                {envTag}
              </Badge>
            )}
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('nav:navigation')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url;
                if (item.disabled) {
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton disabled aria-disabled="true" className="opacity-40">
                        <item.icon />
                        <span>{t(`nav:${item.id}`)}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{t(`nav:${item.id}`)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          <span>Live monitoring</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
