
import { API_BASE_URL, getDefaultHeaders, checkResponse } from '@/utils/apiConfig';

import {Message } from '@/model/chat';
// 聊天会话接口
export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  analysisType?: 'challenge' | 'business' | 'hypothesis' | 'general';
}

// 发送消息请求接口
export interface SendMessageRequest {
  sessionId?: string;
  message: string;
  context?: {
    analysisType?: 'challenge' | 'business' | 'hypothesis' | 'general';
    challengeId?: string;
    businessId?: string;
    hypothesisId?: string;
  };
}

// AI回复响应接口
export interface ChatResponse {
  message: {
    id: string;
    type: 'assistant';
    content: string;
    timestamp: string;
    metadata: {
      processingTime?: number;
      confidence?: number;
      conversationStage?: string;
      historicalReports?: any[];
      analysisInsights?: any[];
      thinkingSteps?: string[];
      metricsData?: any;
      generatedReport?: any;
      conversationContext?: any;
      success?: boolean;
    };
  };
  sessionId: string;
  analysisType?: 'challenge' | 'business' | 'hypothesis' | 'general';
  metadata?: {
    processingTime?: number;
    confidence?: number;
    conversationStage?: string;
    historicalReports?: any[];
    analysisInsights?: any[];
    thinkingSteps?: string[];
    metricsData?: any;
    generatedReport?: any;
    conversationContext?: any;
    success?: boolean;
  };
}

// 聊天建议接口
export interface ChatSuggestion {
  id: string;
  text: string;
  category: 'challenge' | 'business' | 'hypothesis' | 'general';
  priority: number;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock数据
const mockSuggestions: ChatSuggestion[] = [
  {
    id: '1',
    text: 'What are the key market segments for life insurance?',
    category: 'business',
    priority: 1
  },
  {
    id: '2',
    text: 'How to analyze customer acquisition costs in insurance?',
    category: 'business',
    priority: 2
  },
  {
    id: '3',
    text: 'What factors drive insurance policy renewal rates?',
    category: 'challenge',
    priority: 3
  },
  {
    id: '4',
    text: 'How to measure customer lifetime value in insurance?',
    category: 'business',
    priority: 4
  },
  {
    id: '5',
    text: 'What are the most effective insurance marketing channels?',
    category: 'business',
    priority: 5
  },
  {
    id: '6',
    text: 'How to analyze competitor pricing strategies?',
    category: 'challenge',
    priority: 6
  },
  {
    id: '7',
    text: 'What demographic trends impact insurance demand?',
    category: 'hypothesis',
    priority: 7
  },
  {
    id: '8',
    text: 'How to optimize insurance product positioning?',
    category: 'business',
    priority: 8
  }
];

const mockSessions: ChatSession[] = [];

export class ChatService {
  private mockSessions: ChatSession[] = mockSessions;
  private mockSuggestions: ChatSuggestion[] = mockSuggestions;

  /**
   * 发送消息并获取AI回复
   */
  async sendMessage(request: SendMessageRequest): Promise<ChatResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/send`, {
        method: 'POST',
        headers: getDefaultHeaders(),
        body: JSON.stringify(request),
      });
      return await checkResponse(response);
    } catch (error) {
      console.error('Error sending message:', error);
      // 降级到模拟数据
      return this.mockSendMessage(request);
    }
  }

  /**
   * 获取聊天建议
   */
  async getChatSuggestions(category?: 'challenge' | 'business' | 'hypothesis' | 'general'): Promise<ChatSuggestion[]> {
    try {
      const url = category 
        ? `${API_BASE_URL}/chat/suggestions?category=${category}`
        : `${API_BASE_URL}/chat/suggestions`;
      
      const response = await fetch(url, {
        headers: getDefaultHeaders()
      });
      return await checkResponse(response);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      // 降级到模拟数据
      await delay(300);
      return category 
        ? this.mockSuggestions.filter(s => s.category === category)
        : this.mockSuggestions;
    }
  }

  /**
   * 创建新的聊天会话
   */
  async createSession(title?: string, analysisType?: 'challenge' | 'business' | 'hypothesis' | 'general'): Promise<ChatSession> {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/sessions`, {
        method: 'POST',
        headers: getDefaultHeaders(),
        body: JSON.stringify({ title, analysisType }),
      });
      return await checkResponse(response);
    } catch (error) {
      console.error('Error creating session:', error);
      // 降级到模拟数据
      await delay(300);
      const newSession: ChatSession = {
        id: Date.now().toString(),
        title: title || 'New Chat Session',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        analysisType
      };
      this.mockSessions.push(newSession);
      return newSession;
    }
  }

  /**
   * 获取聊天会话列表
   */
  async getSessions(): Promise<ChatSession[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/sessions`, {
        headers: getDefaultHeaders()
      });
      return await checkResponse(response);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      // 降级到模拟数据
      await delay(300);
      return this.mockSessions;
    }
  }

  /**
   * 获取特定会话详情
   */
  async getSession(sessionId: string): Promise<ChatSession | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}`, {
        headers: getDefaultHeaders()
      });
      return await checkResponse(response);
    } catch (error) {
      console.error('Error fetching session:', error);
      // 降级到模拟数据
      await delay(300);
      return this.mockSessions.find(s => s.id === sessionId) || null;
    }
  }

  /**
   * 删除聊天会话
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: getDefaultHeaders(),
      });
      await checkResponse(response);
      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      // 降级到模拟数据
      await delay(300);
      const index = this.mockSessions.findIndex(s => s.id === sessionId);
      if (index > -1) {
        this.mockSessions.splice(index, 1);
        return true;
      }
      return false;
    }
  }

  /**
   * 分析消息类型
   */
  analyzeMessageType(messageContent: string): 'challenge' | 'business' | 'hypothesis' | 'general' {
    const lowerMessage = messageContent.toLowerCase();
    
    if (lowerMessage.includes('challenge') || lowerMessage.includes('problem') || lowerMessage.includes('issue')) {
      return 'challenge';
    }
    if (lowerMessage.includes('business') || lowerMessage.includes('market') || lowerMessage.includes('customer') || 
        lowerMessage.includes('acquisition') || lowerMessage.includes('retention')) {
      return 'business';
    }
    if (lowerMessage.includes('hypothesis') || lowerMessage.includes('test') || 
        lowerMessage.includes('experiment') || lowerMessage.includes('analyze')) {
      return 'hypothesis';
    }
    return 'general';
  }

  /**
   * 模拟发送消息（降级方案）
   */
  private async mockSendMessage(request: SendMessageRequest): Promise<ChatResponse> {
    await delay(1000 + Math.random() * 1000); // 模拟网络延迟
    
    const analysisType = request.context?.analysisType || this.analyzeMessageType(request.message);
    
    const thinkingSteps = [
      '对话阶段分类',
      '历史报告检索',
      '搜索结果整理',
      '响应生成'
    ];
    
    let responseContent: string;
    let conversationStage: string;
    
    switch (analysisType) {
      case 'challenge':
        responseContent = `我已识别您的询问是关于挑战分析。正在为您生成详细的挑战分析报告，包括问题识别、影响评估和解决方案建议... [点击查看详细分析]`;
        conversationStage = 'challenge_analysis';
        break;
      case 'business':
        responseContent = `我是您的AI分析助手，专门帮助您：\n\n🔍 **搜索历史分析报告** - 找到相关的过往分析\n💬 **深度对话讨论** - 基于历史报告回答问题\n📊 **查询指标数据** - 获取最新的业务指标\n📋 **生成新分析** - 综合所有信息创建新报告\n\n请告诉我您想了解什么，我会帮您找到相关的历史分析并进行深入讨论。`;
        conversationStage = 'report_search';
        break;
      case 'hypothesis':
        responseContent = `我已收到您的假设测试请求。正在设计实验方案并分析相关数据... [点击查看详细分析]`;
        conversationStage = 'hypothesis_testing';
        break;
      default:
        responseContent = `我已收到您的消息，正在分析相关数据以生成专业的保险分析报告... [点击查看详细分析]`;
        conversationStage = 'general_analysis';
    }
    
    const processingTime = Math.floor(Math.random() * 200) + 300;
    const confidence = 0.95;
    const timestamp = new Date().toISOString();
    const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const metadata = {
      processingTime,
      confidence,
      conversationStage,
      historicalReports: [],
      analysisInsights: [],
      thinkingSteps,
      metricsData: {},
      generatedReport: null,
      conversationContext: {
        hasHistoricalReports: false,
        reportsCount: 0,
        hasMetrics: false
      },
      success: true
    };
    
    return {
      message: {
        id: messageId,
        type: 'assistant',
        content: responseContent,
        timestamp,
        metadata
      },
      sessionId: request.sessionId || Date.now().toString(),
      analysisType,
      metadata
    };
  }

  /**
   * 获取思考过程消息
   */
  generateThinkingMessage(messageContent: string, analysisType: 'challenge' | 'business' | 'hypothesis' | 'general'): Message {
    const ragSources = [
     
    ];
    
    const thinkingSteps = [
      'Analyze the core intent and keywords of user questions',
      'Retrieve relevant insurance business knowledge and data',
      'Combine historical cases and best practices',
      'Generate targeted analysis recommendations and solutions'
    ];
    
    return {
      type: 'thinking',
      content: 'Analyzing your question and retrieving relevant information...',
      metadata: {
        ragSources: ragSources.slice(0, Math.floor(Math.random() * 3) + 2),
        thinkingSteps,
        processingTime: Math.floor(Math.random() * 1000) + 500
      }
    };
  }
}

// 导出单例实例
export const chatService = new ChatService();