
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
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Database, Settings, Table, Layers, Home, Activity, Search, Sparkles } from 'lucide-react';
import { FEATURE_FLAGS } from '@/App';
import { systemService } from '@/services/systemService';
import { useTranslation } from 'react-i18next';

const menuItems = [
  {
    id: 'dashboard',
    url: "/",
    icon: Home,
  },
  {
    id: 'modules',
    url: "/modules",
    icon: Layers,
  },
  {
    id: 'models',
    url: "/models",
    icon: Database,
  },
  {
    id: 'tables',
    url: "/tables",
    icon: Table,
  },
  {
    id: 'discovery',
    url: "/discovery",
    icon: Search,
  },
  {
    id: 'runIngestion',
    url: "/config",
    icon: Settings,
  },
  {
    id: 'monitor',
    url: "/monitor",
    icon: Activity,
  },
  
];

export function AppSidebar() {
  const location = useLocation();
  const { t } = useTranslation(['nav']);
  const appTitle = import.meta.env.VITE_APP_TITLE ?? 'Watchmen Ingestion';
  const [envTag, setEnvTag] = React.useState<string>('');

  React.useEffect(() => {
    systemService.fetchSystemEnv().then((tag) => {
      if (tag) {
        setEnvTag(tag);
      }
    });
  }, []);

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600 text-white">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xl leading-none">{appTitle}</span>
            <span className="text-xs font-medium text-muted-foreground">{t('nav:ingestionPlatform')}</span>
            {envTag && <Badge variant="secondary" className="mt-1 w-fit bg-[#5b6b8c] hover:bg-[#4a5a7a] text-white text-[10px] px-1.5 py-0 h-4 rounded-sm uppercase">{envTag}</Badge>}
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('nav:navigation')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems
                .filter(item => {
                  // Hide Discovery menu item if feature flag is disabled
                  if (item.id === 'discovery' && !FEATURE_FLAGS.showDiscovery) {
                    return false;
                  }
                  return true;
                })
                .map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location.pathname === item.url}
                  >
                    <Link to={item.url}>
                      <item.icon />
                      <span>{t(`nav:${item.id}`)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <p className="text-xs text-gray-500">{appTitle} {t('nav:ingestionPlatform')}</p>
      </SidebarFooter>
    </Sidebar>
  );
}
