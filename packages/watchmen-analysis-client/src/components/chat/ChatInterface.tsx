import React from 'react';
import { useChatInterface } from '@/hooks/useChatInterface';
import { ChatHeader } from './ChatHeader';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { InitialChatInput } from './InitialChatInput';
import { Message } from '@/model/chat';
import { Sparkles, MessageCircle, Brain } from 'lucide-react';

export interface ChatInterfaceProps {
  isSubmitting: boolean;
  chatHistory: Message[];
  onSendMessage: (message: string) => void;
  showSplitView: boolean;
  onBack?: () => void;
  onClose?: () => void;
  onShowAnalysis?: () => void;
  suggestions?: string[];
  onLoadSuggestions?: (category?: 'challenge' | 'business' | 'hypothesis' | 'general') => void;
  onReportGenerated?: (reportContent: string) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  isSubmitting,
  chatHistory,
  onSendMessage,
  showSplitView,
  onBack,
  onClose,
  onShowAnalysis,
  suggestions,
  onLoadSuggestions,
  onReportGenerated,
}) => {
  const {
    inputValue,
    setInputValue,
    expandedMessages,
    inputRef,
    visibleMessages,
    handleKeyPress,
    handleInputChange,
    toggleMessageExpansion,
    handleSendButtonClick,
  } = useChatInterface({
    onSendMessage,
    onReportGenerated,
    chatHistory,
  });

  if (showSplitView) {
    return (
      <div className="flex h-full bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="flex-1 border-r border-slate-200 flex flex-col">
          <ChatHeader onBack={onBack} onClose={onClose} />
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {visibleMessages.map((msg, index) => (
              <ChatMessage
                key={`${msg.type}-${index}-${msg.content.slice(0, 50)}`}
                message={msg}
                index={index}
                isExpanded={expandedMessages.has(index)}
                onToggleExpand={toggleMessageExpansion}
                onShowAnalysis={onShowAnalysis}
              />
            ))}
          </div>
          <ChatInput
            inputRef={inputRef}
            inputValue={inputValue}
            onInputChange={handleInputChange}
            onKeyPress={handleKeyPress}
            onSend={handleSendButtonClick}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    );
  }

  if (chatHistory.length === 0) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-4 rounded-full shadow-lg">
                <Sparkles className="w-12 h-12 text-blue-600" />
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-3 text-slate-800 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Intelligent Conversation Assistant
            </h1>
            {/* <p className="text-slate-600 text-lg mb-8 max-w-md">
              Start conversing with AI assistant to get professional business analysis and insights
            </p> */}
            <InitialChatInput
              inputRef={inputRef}
              inputValue={inputValue}
              onInputChange={handleInputChange}
              onKeyPress={handleKeyPress}
              onSend={handleSendButtonClick}
              isSubmitting={isSubmitting}
              suggestions={suggestions}
              onSuggestionClick={(suggestion) => {
                setInputValue(suggestion);
                inputRef.current?.focus();
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {visibleMessages.map((msg, index) => (
          <ChatMessage
            key={`${msg.type}-${index}-${msg.content.slice(0, 50)}`}
            message={msg}
            index={index}
            isExpanded={expandedMessages.has(index)}
            onToggleExpand={toggleMessageExpansion}
            onShowAnalysis={onShowAnalysis}
          />
        ))}
        {isSubmitting && (
          <div className="flex items-start space-x-4 p-4 bg-white rounded-xl border border-slate-200 shadow-lg transform transition-all duration-300 hover:shadow-xl">
            <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-3 rounded-full shadow-sm">
              <Brain className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex items-center space-x-3 text-slate-600">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
              <span className="text-sm font-medium">AI 正在深度分析中...</span>
            </div>
          </div>
        )}
      </div>
      <ChatInput
        inputRef={inputRef}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        onKeyPress={handleKeyPress}
        onSend={handleSendButtonClick}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default ChatInterface;