
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import ChatInterface from '@/components/chat/ChatInterface';
import { SplitLayout } from '@/components/layout/SplitLayout';
import { useChat } from '@/hooks/useChat';
import { useSessionManagement } from '@/hooks/useSessionManagement';
import { useAnalysisData } from '@/hooks/useAnalysisData';
import { DashboardStats, useDashboardData } from '@/components/page/DashboardData';
import { PlatformGuide } from '@/components/page/PlatformGuide';
import { SessionList } from '@/components/page/SessionList';
import { Button } from '@/components/ui/button';
import { authService } from '@/services/authService';

const Index: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { collapsed } = useSidebar();
  const { user, isLoading } = useAuth();
  
  const {
    isSubmitting,
    chatHistory,
    showSplitView,
    handleSendMessage,
    resetToInitialView,
    currentAnalysisType,
    isLoadingAnalysis,
    suggestions,
    loadSuggestions,
    loadSession: loadChatSession,
    currentSession
  } = useChat();

  const { data: dashboardData } = useDashboardData();
  const { sessions, loading: loadingSessions, showList, setShowList, loadSession, deleteSession } = 
    useSessionManagement(loadChatSession);
  const { conversationStage, documentSearchData, analysisAnswer } = useAnalysisData(chatHistory);
  const [dynamicReportContent, setDynamicReportContent] = React.useState<string>('');

  const handleReportGenerated = React.useCallback((reportContent: string) => {
    setDynamicReportContent(reportContent);
  }, []);

  // 处理认证状态检查和token交换
  useEffect(() => {
    const handleAuthAndToken = async () => {
      // 检查URL中是否有token参数
      const token = searchParams.get('token');
      
      if (token) {
        try {
          // 使用token交换用户信息
          const userData = await authService.exchangeUser(token);
          if (userData) {
            // 存储token和用户信息
            authService.storeToken({
              accessToken: token,
              tokenType: 'Bearer',
              role: userData.role,
              tenantId: userData.tenantId
            });
            
            // 清除URL中的token参数
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('token');
            window.history.replaceState({}, '', newUrl.toString());
            
            // 刷新页面以更新认证状态
            window.location.reload();
            return;
          }
        } catch (error) {
          console.error('Token exchange failed:', error);
          // token无效，清除URL参数并继续检查认证状态
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('token');
          window.history.replaceState({}, '', newUrl.toString());
        }
      }
      
      // 如果不在加载状态且用户未登录，重定向到登录页面
      if (!isLoading && !user) {
        navigate('/login');
      }
    };

    handleAuthAndToken();
  }, [user, isLoading, navigate, searchParams]);

  // 如果正在加载认证状态，显示加载界面
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // 如果用户未登录，不渲染主界面（将被重定向）
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className={`${collapsed ? 'pl-20' : 'pl-56'} min-h-screen transition-all duration-300`}>
        <Header />
        
        <main className={`${showSplitView ? 'h-screen flex' : 'container py-6'}`}>
          {!showSplitView && (
            <div className="mb-6">
              <Button 
                onClick={() => setShowList(!showList)}
                variant="outline"
                className="mb-4"
              >
                {showList ? 'Hide Session List' : 'Show Chat History'}
              </Button>
              
              {showList && (
                <SessionList 
                  sessions={sessions} 
                  loading={loadingSessions} 
                  currentSession={currentSession} 
                  onLoadSession={loadSession} 
                  onDeleteSession={deleteSession} 
                />
              )}
            </div>
          )}
          
          {showSplitView ? (
            <SplitLayout
              isSubmitting={isSubmitting}
              chatHistory={chatHistory}
              onSendMessage={handleSendMessage}
              onBack={resetToInitialView}
              onClose={resetToInitialView}
              suggestions={suggestions}
              onLoadSuggestions={loadSuggestions}
              onReportGenerated={handleReportGenerated}
              isLoading={isLoadingAnalysis}
              conversationStage={conversationStage}
              documentSearchData={documentSearchData}
              analysisAnswer={analysisAnswer}
              currentAnalysisType={currentAnalysisType}
              dynamicReportContent={dynamicReportContent}
              onClearReport={() => setDynamicReportContent('')}
            />
          ) : (
            <div className="max-w-4xl mx-auto">
              <DashboardStats data={dashboardData} />
              <PlatformGuide className="mb-8" />
              
              <ChatInterface
                isSubmitting={isSubmitting}
                chatHistory={chatHistory}
                onSendMessage={handleSendMessage}
                showSplitView={showSplitView}
                onBack={resetToInitialView}
                onClose={resetToInitialView}
                suggestions={suggestions}
                onLoadSuggestions={loadSuggestions}
                onReportGenerated={handleReportGenerated}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Index;
