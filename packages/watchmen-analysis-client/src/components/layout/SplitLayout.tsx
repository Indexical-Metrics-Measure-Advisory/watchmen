import React, { useState } from 'react';
import ChatInterface from '@/components/chat/ChatInterface';
import AnalysisReport from '@/components/page/AnalysisReport';
import { Message } from '@/model/chat';

interface SplitLayoutProps {
  isSubmitting: boolean;
  chatHistory: Message[];
  onSendMessage: (message: string) => void;
  onBack?: () => void;
  onClose?: () => void;
  suggestions?: string[];
  onLoadSuggestions?: (category?: 'challenge' | 'business' | 'hypothesis' | 'general') => void;
  onReportGenerated?: (reportContent: string) => void;
  isLoading: boolean;
  conversationStage: string | null;
  documentSearchData: any;
  analysisAnswer: any;
  currentAnalysisType: string | null;
  dynamicReportContent: string;
  onClearReport: () => void;
}

export const SplitLayout: React.FC<SplitLayoutProps> = ({
  isSubmitting,
  chatHistory,
  onSendMessage,
  onBack,
  onClose,
  suggestions,
  onLoadSuggestions,
  onReportGenerated,
  isLoading,
  conversationStage,
  documentSearchData,
  analysisAnswer,
  currentAnalysisType,
  dynamicReportContent,
  onClearReport,
}) => {
  const [isReportCollapsed, setIsReportCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-white w-full">
      {/* 主聊天区域 */}
      <div className={`flex flex-col transition-all duration-300 ease-in-out flex-1`}>
        <ChatInterface
          isSubmitting={isSubmitting}
          chatHistory={chatHistory}
          onSendMessage={onSendMessage}
          showSplitView={true}
          onBack={onBack}
          onClose={onClose}
          onShowAnalysis={() => setIsReportCollapsed(false)}
          suggestions={suggestions}
          onLoadSuggestions={onLoadSuggestions}
          onReportGenerated={onReportGenerated}
        />
      </div>

      {/* 分隔线和控制按钮 */}
      <div className="flex items-center justify-center flex-none w-6 bg-slate-200 hover:bg-slate-300 transition-colors duration-200 cursor-pointer group" onClick={() => setIsReportCollapsed(!isReportCollapsed)}>
        <div className="flex flex-col items-center space-y-1 text-slate-600 group-hover:text-slate-800">
          {isReportCollapsed ? (
            <svg className="w-4 h-4 transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </div>
      </div>

      {/* 右侧分析报告 */}
      <div className={`flex flex-col bg-gradient-to-br from-slate-50 to-blue-50 shadow-2xl transition-all duration-300 ease-in-out relative ${
        isReportCollapsed ? 'flex-none w-0 overflow-hidden' : 'flex-1'
      }`}>
        
        {/* 分析报告内容 */}
        <div className="h-full overflow-y-auto">
          <AnalysisReport
            isLoading={isLoading}
            conversationStage={conversationStage}
            documentSearchData={documentSearchData}
            analysisAnswer={analysisAnswer}
            currentAnalysisType={currentAnalysisType}
            dynamicReportContent={dynamicReportContent}
            onClearReport={onClearReport}
          />
        </div>
      </div>
    </div>
  );
};