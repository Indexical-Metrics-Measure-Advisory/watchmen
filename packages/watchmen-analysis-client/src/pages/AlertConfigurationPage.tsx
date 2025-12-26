import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useSidebar } from '@/contexts/SidebarContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlobalAlertRuleList } from '@/components/alert/GlobalAlertRuleList';
import { SuggestedActionManagement } from '@/components/suggested-action/SuggestedActionManagement';

export const AlertConfigurationPage: React.FC = () => {
  const { collapsed } = useSidebar();
  const [activeTab, setActiveTab] = useState("suggested-actions");

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={`${collapsed ? 'pl-20' : 'pl-56'} min-h-screen transition-all duration-300`}>
        <Header />
        
        <main className="container py-8 space-y-6">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Configuration</h1>
              <p className="text-muted-foreground">Manage alert rules and suggested actions.</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="suggested-actions">Suggested Actions</TabsTrigger>
              <TabsTrigger value="alert-rules">Alert Rules</TabsTrigger>
            </TabsList>
            
            <TabsContent value="suggested-actions" className="mt-6">
              <SuggestedActionManagement />
            </TabsContent>
            
            <TabsContent value="alert-rules" className="mt-6">
              <GlobalAlertRuleList />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};
