import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Button } from '@/components/ui/button';
import { FileText, Search, MessageSquare, Sparkles, Clock, TrendingUp, CheckCircle2 } from 'lucide-react';

interface AnalysisReportProps {
  isLoading: boolean;
  conversationStage: string | null;
  documentSearchData: any;
  analysisAnswer: any;
  currentAnalysisType: string | null;
  dynamicReportContent: string;
  onClearReport: () => void;
}

// Loading component
const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 to-blue-50">
    <div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-slate-200 transform transition-all duration-300 hover:shadow-2xl">
      <div className="relative mb-6">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-100 border-t-blue-500 mx-auto"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-blue-500 animate-pulse" />
        </div>
      </div>
      <h3 className="text-2xl font-bold mb-2 text-slate-800 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Analyzing...</h3>
      <p className="text-slate-600 text-lg">AI is generating a professional analysis report. Please wait.</p>
      <div className="mt-4 flex justify-center">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
        </div>
      </div>
    </div>
  </div>
);

// Common markdown configuration
const MarkdownConfig = {
  remarkPlugins: [remarkGfm],
  components: {
    p: ({ children }: { children: React.ReactNode }) => <p className="text-slate-700 mb-3 leading-relaxed">{children}</p>,
    ul: ({ children }: { children: React.ReactNode }) => <ul className="list-disc list-inside text-slate-700 mb-3 space-y-1">{children}</ul>,
    ol: ({ children }: { children: React.ReactNode }) => <ol className="list-decimal list-inside text-slate-700 mb-3 space-y-1">{children}</ol>,
    h1: ({ children }: { children: React.ReactNode }) => <h1 className="text-xl font-bold text-slate-800 mb-3">{children}</h1>,
    h2: ({ children }: { children: React.ReactNode }) => <h2 className="text-lg font-bold text-slate-800 mb-2">{children}</h2>,
    h3: ({ children }: { children: React.ReactNode }) => <h3 className="text-base font-bold text-slate-700 mb-2">{children}</h3>,
    strong: ({ children }: { children: React.ReactNode }) => <strong className="text-slate-800 font-semibold">{children}</strong>,
    code: ({ children }: { children: React.ReactNode }) => <code className="bg-slate-100 px-2 py-1 rounded text-sm text-slate-800 border">{children}</code>,
    blockquote: ({ children }: { children: React.ReactNode }) => (
      <blockquote className="border-l-4 border-blue-300 pl-4 italic text-slate-600 my-3 bg-blue-50 py-2 rounded-r">
        {children}
      </blockquote>
    ),
  }
};

// Document search component
const DocumentSearchReport: React.FC<{ data: any }> = ({ data }) => {
  const ReportCard: React.FC<{ report: any; index: number }> = ({ report, index }) => (
    <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-6 border border-slate-200 hover:shadow-lg transition-all duration-300 hover:border-blue-300 group">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-700 transition-colors">{report.title}</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded-full font-medium shadow-sm">
              {report.contentType || 'Report'}
            </span>
            {report.relevanceScore !== undefined && (
              <span className="text-sm px-3 py-1 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 rounded-full font-medium shadow-sm flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                Relevance: {(report.relevanceScore * 100).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {report.content && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-medium text-slate-700">Full Content:</h4>
            <button
              onClick={() => {
                const element = document.getElementById(`full-content-preview-${index}`);
                if (element) {
                  element.requestFullscreen();
                }
              }}
              className="text-slate-500 hover:text-slate-700 text-sm px-3 py-1 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
            >
              Full Screen
            </button>
          </div>
          <div className="relative">
            <div id={`full-content-preview-${index}`} className="bg-white rounded-lg border border-slate-200 max-h-96 w-full lg:max-w-2xl xl:max-w-3xl overflow-hidden">
              <div className="p-4 text-sm text-slate-700 overflow-y-auto h-full">
                <div className="prose prose-slate prose-sm max-w-none">
                  <ReactMarkdown {...MarkdownConfig}>{report.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {report.semanticSection && (
        <div className="text-xs text-slate-500 bg-white px-3 py-1 rounded-lg inline-block">
          Section: {report.semanticSection}
        </div>
      )}
    </div>
  );

  const ContextCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; colorClass: string }> = ({ title, value, icon, colorClass }) => (
    <div className={`flex items-center justify-between p-4 bg-gradient-to-r ${colorClass} rounded-lg border shadow-sm`}>
      <span className="font-medium text-slate-700 flex items-center">
        {icon}
        {title}
      </span> 
      <span className="font-bold bg-white px-3 py-1 rounded-full shadow-sm">{value}</span>
    </div>
  );

  return (
    <div className="space-y-6 overflow-y-auto">
      <div className="text-center mb-8 bg-white rounded-2xl p-8 shadow-lg border border-slate-200 transform transition-all duration-300 hover:shadow-xl">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-4 rounded-full shadow-lg">
            <Search className="w-10 h-10 text-blue-600" />
          </div>
        </div>
        <h1 className="text-4xl font-bold mb-3 text-slate-800 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Document Search</h1>
        <p className="text-slate-600 text-lg">AI-powered document discovery and analysis</p>
        <div className="flex justify-between items-center mt-8 pt-4 border-t border-slate-100">
          <div className="flex items-center text-sm text-slate-500">
            <Clock className="w-4 h-4 mr-2" />
            <span>Generated at: {new Date().toLocaleString()}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 rounded-full font-medium shadow-sm">Document Search</span>
          </div>
        </div>
      </div>
      
      {data.historicalReports && data.historicalReports.length > 0 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200 transform transition-all duration-300 hover:shadow-xl">
            <div className="flex items-center mb-6">
              <div className="bg-gradient-to-br from-blue-100 to-indigo-100 p-3 rounded-full mr-3 shadow-sm">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Found Documents</h2>
                <p className="text-slate-600 mt-1">
                  Found <span className="font-bold text-blue-600">{data.historicalReports.length}</span> relevant documents based on your search criteria
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {data.historicalReports.map((report: any, index: number) => (
                <ReportCard key={report.id || index} report={report} index={index} />
              ))}
            </div>
          </div>
        </div>
      )}
      
      {data.conversationContext && (
        <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200 transform transition-all duration-300 hover:shadow-xl">
          <div className="flex items-center mb-4">
            <div className="bg-gradient-to-br from-purple-100 to-pink-100 p-2 rounded-full mr-3 shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Search Context Analysis</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {data.conversationContext.hasHistoricalReports && (
              <ContextCard 
                title="Historical Reports" 
                value="Available" 
                icon={<CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />} 
                colorClass="from-green-50 to-emerald-50 border-green-200"
              />
            )}
            {data.conversationContext.reportsCount !== undefined && (
              <ContextCard 
                title="Reports Found" 
                value={data.conversationContext.reportsCount} 
                icon={<TrendingUp className="w-4 h-4 mr-2 text-blue-500" />} 
                colorClass="from-blue-50 to-indigo-50 border-blue-200"
              />
            )}
            {data.conversationContext.hasMetrics !== undefined && (
              <ContextCard 
                title="Metrics Data" 
                value={data.conversationContext.hasMetrics ? 'Available' : 'Unavailable'} 
                icon={<TrendingUp className="w-4 h-4 mr-2" />} 
                colorClass={data.conversationContext.hasMetrics ? 'from-green-50 to-emerald-50 border-green-200' : 'from-gray-50 to-slate-50 border-gray-200'}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Deep conversation component
const DeepConversationReport: React.FC<{ answer: any }> = ({ answer }) => (
  <div className="space-y-6 overflow-y-auto">
    <div className="text-center mb-8 bg-white rounded-2xl p-8 shadow-lg border border-slate-200 transform transition-all duration-300 hover:shadow-xl">
      <div className="flex items-center justify-center mb-6">
        <div className="bg-gradient-to-br from-purple-100 to-pink-100 p-4 rounded-full shadow-lg">
          <MessageSquare className="w-10 h-10 text-purple-600" />
        </div>
      </div>
      <h1 className="text-4xl font-bold mb-3 text-slate-800 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Deep Conversation Analysis</h1>
      <p className="text-slate-600 text-lg">Intelligent insights and analysis based on conversation content</p>
    </div>
    
    <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200 transform transition-all duration-300 hover:shadow-xl">
      <div className="flex items-center mb-4">
        <div className="bg-gradient-to-br from-blue-100 to-indigo-100 p-2 rounded-full mr-3 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-blue-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-800">Analysis Results</h3>
      </div>
      <div className="prose prose-slate prose-sm max-w-none">
        <ReactMarkdown {...MarkdownConfig}>{answer.answer}</ReactMarkdown>
      </div>
    </div>
    
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
      <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
        <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
        Reason
      </h3>
      <div className="prose prose-slate prose-sm max-w-none">
        <ReactMarkdown {...MarkdownConfig}>{answer.reason}</ReactMarkdown>
      </div>
    </div>
  </div>
);

// General analysis component
const GeneralAnalysisReport: React.FC<{ type: string; content: string }> = ({ type, content }) => {
  const getTitle = () => {
    switch (type) {
      case 'hypothesis': return 'Hypothesis Validation Analysis';
      case 'challenge': return 'Challenge Identification Analysis';
      case 'business': return 'Business Insight Analysis';
      default: return 'Comprehensive Analysis Report';
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'hypothesis': return 'Hypothesis Validation';
      case 'challenge': return 'Challenge Identification';
      case 'business': return 'Business Insight';
      default: return 'Comprehensive Analysis';
    }
  };

  return (
    <div className="space-y-6 overflow-y-auto">
      <div className="text-center mb-8 bg-white rounded-2xl p-8 shadow-lg border border-slate-200 transform transition-all duration-300 hover:shadow-xl">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-4 rounded-full shadow-lg">
            <Sparkles className="w-10 h-10 text-indigo-600" />
          </div>
        </div>
        <h1 className="text-4xl font-bold mb-3 text-slate-800 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{getTitle()}</h1>
        <p className="text-slate-600 text-lg">{getTitle()}</p>
        <div className="flex justify-between items-center mt-8 pt-4 border-t border-slate-100">
          <div className="flex items-center text-sm text-slate-500">
            <Clock className="w-4 h-4 mr-2" />
            <span>Generated at: {new Date().toLocaleString()}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm px-4 py-2 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-full font-medium shadow-sm">
              {getTypeLabel()}
            </span>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200 transform transition-all duration-300 hover:shadow-xl">
        <div className="prose prose-slate max-w-none">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              ...MarkdownConfig.components,
              p: ({ children }: { children: React.ReactNode }) => <p className="text-slate-700 mb-4 leading-relaxed text-base">{children}</p>,
              ul: ({ children }: { children: React.ReactNode }) => <ul className="list-disc list-inside text-slate-700 mb-4 space-y-2">{children}</ul>,
              h1: ({ children }: { children: React.ReactNode }) => <h1 className="text-2xl font-bold mb-4 border-b border-slate-200 pb-2">{children}</h1>,
              h2: ({ children }: { children: React.ReactNode }) => <h2 className="text-xl font-bold mb-3">{children}</h2>,
              h3: ({ children }: { children: React.ReactNode }) => <h3 className="text-lg font-bold mb-2">{children}</h3>,
              table: ({ children }: { children: React.ReactNode }) => (
                <div className="overflow-x-auto my-4">
                  <table className="min-w-full divide-y divide-slate-200 border border-slate-200 rounded-lg">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }: { children: React.ReactNode }) => <thead className="bg-gradient-to-r from-slate-50 to-slate-100">{children}</thead>,
              th: ({ children }: { children: React.ReactNode }) => <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">{children}</th>,
              td: ({ children }: { children: React.ReactNode }) => <td className="px-4 py-3 text-sm text-slate-600 border-t border-slate-200">{children}</td>,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

// Empty state component
const EmptyState: React.FC = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
      <div className="flex items-center justify-center mb-4">
        <div className="bg-gray-100 p-4 rounded-full">
          <FileText className="w-12 h-12 text-gray-400" />
        </div>
      </div>
      <h2 className="text-2xl font-semibold text-slate-800 mb-2">Analysis Panel</h2>
      <p className="text-slate-600">Your analysis report will appear here.</p>
    </div>
  </div>
);

const AnalysisReport: React.FC<AnalysisReportProps> = ({ 
  isLoading, 
  conversationStage, 
  documentSearchData, 
  analysisAnswer, 
  currentAnalysisType, 
  dynamicReportContent, 
  onClearReport 
}) => {
  if (isLoading) {
    return <LoadingSpinner />;
  }

  const renderContent = () => {
    if (conversationStage === 'document_search' && documentSearchData) {
      return <DocumentSearchReport data={documentSearchData} />;
    }
    
    if (conversationStage === 'deep_conversation' && analysisAnswer) {
      return <DeepConversationReport answer={analysisAnswer} />;
    }
    
    if (currentAnalysisType) {
      return <GeneralAnalysisReport type={currentAnalysisType} content={dynamicReportContent} />;
    }
    
    return <EmptyState />;
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="p-6">
        <div className="flex justify-end mb-4">
          <Button
            onClick={onClearReport}
            variant="outline"
            className="bg-white hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 text-red-600 border-red-200 hover:border-red-300 hover:text-red-700 hover:shadow-md transition-all duration-200 transform hover:scale-105"
          >
            Clear Report
          </Button>
        </div>
        {renderContent()}
      </div>
    </div>
  );
};

export default AnalysisReport;