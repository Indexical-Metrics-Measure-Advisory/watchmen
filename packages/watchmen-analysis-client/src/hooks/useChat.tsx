import React, { useState, useCallback, useEffect, useRef } from 'react';
import { chatService, ChatSession, SendMessageRequest } from '@/services/chatService';
import { Message, UserMessage, AssistantMessage, SystemMessage, DeveloperMessage, ToolMessage } from '@/model/chat';


export interface UseChatReturn {
  isSubmitting: boolean;
  chatHistory: Message[];
  showSplitView: boolean;
  handleSendMessage: (message: string) => Promise<void>;
  resetToInitialView: () => void;
  currentAnalysisType: 'challenge' | 'business' | 'hypothesis' | 'general' | null;
  isLoadingAnalysis: boolean;
  currentSession: ChatSession | null;
  suggestions: string[];
  loadSuggestions: (category?: 'challenge' | 'business' | 'hypothesis' | 'general') => Promise<void>;
  loadSession: (session: ChatSession) => Promise<void>;
  // 新增的消息创建辅助函数
  createUserMessage: (content: string, userId?: string) => UserMessage;
  createAssistantMessage: (content: string, metadata?: AssistantMessage['metadata']) => AssistantMessage;
  createSystemMessage: (content: string, priority?: SystemMessage['metadata']['priority']) => SystemMessage;
  createDeveloperMessage: (content: string, debugInfo?: string) => DeveloperMessage;
  createToolMessage: (content: string, toolName: string, success: boolean, result?: any) => ToolMessage;
  createChartMessage: (content: string, chartType: string, chartData: any[], options?: any) => any;
  createTableMessage: (content: string, tableData: any[], tableHeaders: string[], options?: any) => any;
}

export const useChat = (): UseChatReturn => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSplitView, setShowSplitView] = useState(false);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [currentAnalysisType, setCurrentAnalysisType] = useState<'challenge' | 'business' | 'hypothesis' | 'general' | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);

  const isSubmittingRef = useRef(isSubmitting);

  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);
  const [suggestions, setSuggestions] = useState<string[]>([
    "What are the key market segments for life insurance?",
    "How to analyze customer acquisition costs in insurance?",
    "What factors drive insurance policy renewal rates?",
    "How to measure customer lifetime value in insurance?",
    "What are the most effective insurance marketing channels?",
    "How to analyze competitor pricing strategies?",
    "What demographic trends impact insurance demand?",
    "How to optimize insurance product positioning?"
  ]);

  // 加载聊天建议
  const loadSuggestions = useCallback(async (category?: 'challenge' | 'business' | 'hypothesis' | 'general') => {
    try {
      const chatSuggestions = await chatService.getChatSuggestions(category);
      setSuggestions(chatSuggestions.map(s => s.text));
    } catch (error) {
      console.error('Error loading suggestions:', error);
      // 保持默认建议
    }
  }, []);

  // 加载会话
  const loadSession = useCallback(async (session: ChatSession) => {
    try {
      // 获取完整的会话数据
      const fullSession = await chatService.getSession(session.id);
      if (fullSession) {
        setCurrentSession(fullSession);
        setChatHistory(fullSession.messages);
        setCurrentAnalysisType(fullSession.analysisType || null);
        setShowSplitView(true);
      }
    } catch (error) {
      console.error('Error loading session:', error);
      // 降级方案：使用传入的会话数据
      setCurrentSession(session);
      setChatHistory(session.messages);
      setCurrentAnalysisType(session.analysisType || null);
      setShowSplitView(true);
    }
  }, []);

  // 创建新会话
  const createNewSession = useCallback(async (analysisType?: 'challenge' | 'business' | 'hypothesis' | 'general', sessionTitle?: string) => {
    try {
      const title = sessionTitle || 'New Chat Session';
      const session = await chatService.createSession(title, analysisType);
 
      setCurrentSession(session);
      return session;
    } catch (error) {
      console.error('Error creating session:', error);
      // 创建本地会话作为降级方案
      const localSession: ChatSession = {
        id: Date.now().toString(),
        title: sessionTitle || 'New Chat Session',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        analysisType
      };
      setCurrentSession(localSession);
      return localSession;
    }
  }, []);

  // 消息创建辅助函数
  const createUserMessage = useCallback((content: string, userId?: string): UserMessage => {
    return {
      type: 'user',
      content,
      metadata: {
        timestamp: new Date().toISOString(),
        userId,
        sessionId: currentSession?.id
      }
    };
  }, [currentSession?.id]);

  const createAssistantMessage = useCallback((content: string, metadata?: Omit<AssistantMessage['metadata'], 'timestamp'>): AssistantMessage => {
    return {
      type: 'assistant',
      content,
      metadata: {
        ...metadata,
        // Timestamp is not part of AssistantMessage metadata type, removing it
      }
    };
  }, []);

  const createSystemMessage = useCallback((content: string, priority: SystemMessage['metadata']['priority'] = 'medium'): SystemMessage => {
    return {
      type: 'system',
      content,
      metadata: {
        priority,
        timestamp: new Date().toISOString()
      }
    };
  }, []);

  const createDeveloperMessage = useCallback((content: string, debugInfo?: string): DeveloperMessage => {
    return {
      type: 'developer',
      content,
      metadata: {
        debugInfo,
        timestamp: new Date().toISOString()
      }
    };
  }, []);

  const createToolMessage = useCallback((content: string, toolName: string, success: boolean, result?: any): ToolMessage => {
    return {
      type: 'tool',
      content,
      metadata: {
        toolName,
        toolResult: result,
        success
      }
    };
  }, []);

  const createChartMessage = useCallback((content: string, chartType: string, chartData: any[], options?: any): any => {
    return {
      type: 'chart',
      content,
      metadata: {
        chartType,
        chartData,
        chartOptions: options?.chartOptions,
        title: options?.title,
        description: options?.description,
        dataSource: options?.dataSource,
        timestamp: new Date().toISOString(),
        interactive: options?.interactive ?? true,
        exportable: options?.exportable ?? true
      }
    };
  }, []);

  const createTableMessage = useCallback((content: string, tableData: any[], tableHeaders: string[], options?: any): any => {
    return {
      type: 'table',
      content,
      metadata: {
        tableData,
        tableHeaders,
        title: options?.title,
        description: options?.description,
        dataSource: options?.dataSource,
        timestamp: new Date().toISOString(),
        sortable: options?.sortable ?? true,
        filterable: options?.filterable ?? true,
        exportable: options?.exportable ?? true,
        pagination: options?.pagination ?? true,
        pageSize: options?.pageSize ?? 10
      }
    };
  }, []);

  // 发送消息处理函数
  const handleSendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isSubmittingRef.current) return;

    setIsSubmitting(true);
    setIsLoadingAnalysis(true);

    const currentMessage = message;

    try {
      // 添加用户消息到聊天历史
      const userMessage: Message = { type: 'user', content: currentMessage };
      setChatHistory(prev => [...prev, userMessage]);

      // 分析消息类型
      const analysisType = chatService.analyzeMessageType(currentMessage);
      setCurrentAnalysisType(analysisType);

      // 如果没有当前会话，创建新会话
      let session = currentSession;
      if (!session) {
        // 使用第一条消息作为会话名称，限制长度以保持可读性
        const sessionTitle = currentMessage.length > 50 ? currentMessage.substring(0, 50) + '...' : currentMessage;
        session = await createNewSession(analysisType, sessionTitle);
      }

      // 如果是分析类型的消息，则切换到分屏视图
      if (analysisType) {
        setShowSplitView(true);
      }

      // 添加思考消息
      const thinkingMessage = chatService.generateThinkingMessage(currentMessage, analysisType);

      setTimeout(() => {
        setChatHistory(prev => [...prev, thinkingMessage]);
      }, 500);

      // 准备发送消息请求
      const sendRequest: SendMessageRequest = {
        sessionId: session.id,
        message: currentMessage,
        context: {
          analysisType
        }
      };

      // 发送消息到后台
      const response = await chatService.sendMessage(sendRequest);

      // 将响应消息转换为Message格式
      const assistantMessage: Message = {
        type: 'assistant',
        content: response.message.content,
        id: response.message.id,
        timestamp: response.message.timestamp,
        metadata: {
          ...response.message.metadata,
          intent: response.message.metadata.conversationStage === 'report_generation' ? 'report_generation' : undefined
        }
      };

      // 添加AI回复到聊天历史并立即结束提交状态
      setChatHistory(prev => [...prev, assistantMessage]);
      setIsSubmitting(false);

      // 模拟分析加载时间
      setTimeout(() => {
        setIsLoadingAnalysis(false);
      }, 3000);

      // 更新当前会话
      if (session) {
        const updatedSession: ChatSession = {
          ...session,
          messages: [...session.messages, userMessage, assistantMessage],
          updatedAt: new Date().toISOString(),
          analysisType: response.analysisType || analysisType
        };
        setCurrentSession(updatedSession);
      }


    } catch (error) {
      console.error('Error sending message:', error);

      // 错误处理 - 添加错误消息
      const errorMessage: Message = {
        type: 'assistant',
        content: 'Sorry, I encountered an error while processing your message. Please try again later.'
      };

      setTimeout(() => {
        setChatHistory(prev => [...prev, errorMessage]);
        setIsSubmitting(false);
        setIsLoadingAnalysis(false);
      }, 1000);
    }
  }, [currentSession, createNewSession]);

  // 重置到初始视图
  const resetToInitialView = useCallback(() => {
    setShowSplitView(false);
    setChatHistory([]);
    setIsSubmitting(false);
    setCurrentAnalysisType(null);
    setIsLoadingAnalysis(false);
    setCurrentSession(null);
  }, []);



  // 初始化时加载建议
  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  return {
    isSubmitting,
    chatHistory,
    showSplitView,
    handleSendMessage,
    resetToInitialView,
    isLoadingAnalysis,
    currentAnalysisType,
    currentSession,
    suggestions,
    loadSuggestions,
    loadSession,
    createUserMessage,
    createAssistantMessage,
    createSystemMessage,
    createDeveloperMessage,
    createToolMessage,
    createChartMessage,
    createTableMessage
  };
};