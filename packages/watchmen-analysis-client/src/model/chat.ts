
// 扩展的消息类型定义
export interface DeveloperMessage {
  type: 'developer';
  content: string;
  metadata?: {
    debugInfo?: string;
    stackTrace?: string[];
    timestamp?: string;
  };
}

export interface SystemMessage {
  type: 'system';
  content: string;
  metadata?: {
    systemEvent?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    timestamp?: string;
  };
}

export interface AssistantMessage {
  type: 'assistant';
  content: string;
  id?: string;
  timestamp?: string;
  metadata?: {
    ragSources?: string[];
    thinkingSteps?: string[];
    processingTime?: number;
    confidence?: number;
    modelUsed?: string;
    intent?: string;
    conversationStage?: string;
    historicalReports?: any[];
    analysisInsights?: any[];
    metricsData?: any;
    generatedReport?: any;
    conversationContext?: any;
    success?: boolean;
    analysis_answer?: {
      answer: string;
      reason: string;
    };
  };
}

export interface UserMessage {
  type: 'user';
  content: string;
  metadata?: {
    timestamp?: string;
    userId?: string;
    sessionId?: string;
  };
}

export interface ToolMessage {
  type: 'tool';
  content: string;
  metadata?: {
    toolName?: string;
    toolResult?: any;
    executionTime?: number;
    success?: boolean;
    errorMessage?: string;
  };
}

export interface ThinkingMessage {
  type: 'thinking';
  content: string;
  metadata?: {
    ragSources?: string[];
    thinkingSteps?: string[];
    processingTime?: number;
  };
}

export interface ChartMessage {
  type: 'chart';
  content: string;
  metadata?: {
    chartType?: 'line' | 'bar' | 'pie' | 'scatter' | 'area' | 'histogram' | 'boxplot';
    chartData?: any[];
    chartOptions?: any;
    title?: string;
    description?: string;
    dataSource?: string;
    timestamp?: string;
    interactive?: boolean;
    exportable?: boolean;
  };
}

export interface TableMessage {
  type: 'table';
  content: string;
  metadata?: {
    tableData?: any[];
    tableHeaders?: string[];
    title?: string;
    description?: string;
    dataSource?: string;
    timestamp?: string;
    sortable?: boolean;
    filterable?: boolean;
    exportable?: boolean;
    pagination?: boolean;
    pageSize?: number;
  };
}

// 联合类型定义
export type Message = 
  | DeveloperMessage 
  | SystemMessage 
  | AssistantMessage 
  | UserMessage 
  | ToolMessage
  | ThinkingMessage
  | ChartMessage
  | TableMessage