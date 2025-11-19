
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
import { Database, Settings, Table, Layers, Home, Activity, Search } from 'lucide-react';
import { FEATURE_FLAGS } from '@/App';

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "Modules",
    url: "/modules",
    icon: Layers,
  },
  {
    title: "Models",
    url: "/models",
    icon: Database,
  },
  {
    title: "Tables",
    url: "/tables",
    icon: Table,
  },
  {
    title: "Discovery",
    url: "/discovery",
    icon: Search,
  },
  {
    title: "Configuration",
    url: "/config",
    icon: Settings,
  },
  {
    title: "Monitor",
    url: "/monitor",
    icon: Activity,
  },
  
];

export function AppSidebar() {
  const location = useLocation();
  const appTitle = import.meta.env.VITE_APP_TITLE ?? 'Watchmen Ingestion';

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <Database className="h-6 w-6 text-blue-600" />
          <span className="font-bold text-lg">{appTitle}</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems
                .filter(item => {
                  // Hide Discovery menu item if feature flag is disabled
                  if (item.title === 'Discovery' && !FEATURE_FLAGS.showDiscovery) {
                    return false;
                  }
                  return true;
                })
                .map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location.pathname === item.url}
                  >
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <p className="text-xs text-gray-500">Watchmen Ingestion Platform</p>
      </SidebarFooter>
    </Sidebar>
  );
}
