import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';
import Sidebar from './Sidebar';
import Header from './Header';

/**
 * Shared application chrome: sidebar + header + content area.
 * Pages render inside <Outlet /> and must NOT mount their own Sidebar/Header
 * or add left-offset padding for the sidebar — it is owned here.
 */
const AppLayout: React.FC = () => {
  const { collapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={cn(
        'flex min-h-screen flex-col transition-[padding] duration-300',
        collapsed ? 'md:pl-20' : 'md:pl-56'
      )}>
        <Header />
        <main className="flex-1 flex flex-col">
          <Suspense fallback={
            <div className="flex flex-1 items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          }>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
