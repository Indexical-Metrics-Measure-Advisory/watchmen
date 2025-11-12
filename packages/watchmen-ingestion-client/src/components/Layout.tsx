import React from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from '@/context/AuthContext';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const getUserAvatar = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <TooltipProvider>
      <Sonner />
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 flex flex-col">
            <div className="sticky top-0 z-40 bg-white border-b px-4 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SidebarTrigger />
                  
                </div>
                {user && (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {getUserAvatar(user.name)}
                    </div>
                    <button
                      onClick={logout}
                      className="text-xs text-gray-600 hover:text-red-600"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
};

export default Layout;