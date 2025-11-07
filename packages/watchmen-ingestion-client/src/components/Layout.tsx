import React from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

const Layout: React.FC = () => {
  return (
    <TooltipProvider>
      <Sonner />
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 flex flex-col">
            <div className="sticky top-0 z-40 bg-white border-b px-4 py-2">
              <SidebarTrigger />
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