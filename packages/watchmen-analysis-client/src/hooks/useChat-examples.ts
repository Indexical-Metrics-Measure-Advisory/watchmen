// // useChat 钩子的消息类型使用示例
// import {Message, UserMessage, AssistantMessage, SystemMessage, DeveloperMessage, ToolMessage } from '@/model/chat';


// import { useChat } from './useChat';

// // 示例：如何在组件中使用不同的消息类型
// export const ChatExamples = () => {
//   const {
//     chatHistory,
//     createUserMessage,
//     createAssistantMessage,
//     createSystemMessage,
//     createDeveloperMessage,
//     createToolMessage
//   } = useChat();

//   // 示例 1: 创建用户消息
//   const handleUserInput = (content: string, userId?: string) => {
//     const userMessage = createUserMessage(content, userId);
//     console.log('User message:', userMessage);
//     // 输出示例:
//     // {
//     //   type: 'user',
//     //   content: 'What are the key factors affecting customer retention?',
//     //   metadata: {
//     //     timestamp: '2024-01-15T10:30:00.000Z',
//     //     userId: 'user123',
//     //     sessionId: 'session456'
//     //   }
//     // }
//   };

//   // 示例 2: 创建助手消息
//   const handleAssistantResponse = (content: string) => {
//     const assistantMessage = createAssistantMessage(content, {
//       ragSources: [
//         'Customer Retention Analysis Report 2024',
//         'Insurance Industry Best Practices'
//       ],
//       thinkingSteps: [
//         'Analyzing customer data patterns',
//         'Identifying key retention factors',
//         'Generating actionable insights'
//       ],
//       processingTime: 1500,
//       confidence: 0.92,
//       modelUsed: 'gpt-4-turbo'
//     });
//     console.log('Assistant message:', assistantMessage);
//   };

//   // 示例 3: 创建系统消息
//   const handleSystemNotification = (event: string, priority: 'low' | 'medium' | 'high' | 'critical' = 'medium') => {
//     const systemMessage = createSystemMessage(
//       `System notification: ${event}`,
//       priority
//     );
//     console.log('System message:', systemMessage);
//     // 输出示例:
//     // {
//     //   type: 'system',
//     //   content: 'System notification: New data available',
//     //   metadata: {
//     //     priority: 'high',
//     //     timestamp: '2024-01-15T10:30:00.000Z'
//     //   }
//     // }
//   };

//   // 示例 4: 创建开发者消息
//   const handleDebugInfo = (debugContent: string, debugInfo?: string) => {
//     const developerMessage = createDeveloperMessage(debugContent, debugInfo);
//     console.log('Developer message:', developerMessage);
//     // 输出示例:
//     // {
//     //   type: 'developer',
//     //   content: 'Debug: API response validation failed',
//     //   metadata: {
//     //     debugInfo: 'Expected object but received array',
//     //     timestamp: '2024-01-15T10:30:00.000Z'
//     //   }
//     // }
//   };

//   // 示例 5: 创建工具消息
//   const handleToolExecution = (toolName: string, result: any, success: boolean) => {
//     const toolMessage = createToolMessage(
//       success ? `Tool ${toolName} executed successfully` : `Tool ${toolName} execution failed`,
//       toolName,
//       success,
//       result
//     );
//     console.log('Tool message:', toolMessage);
//     // 输出示例:
//     // {
//     //   type: 'tool',
//     //   content: 'Tool data_analyzer executed successfully',
//     //   metadata: {
//     //     toolName: 'data_analyzer',
//     //     toolResult: { analysis: 'Customer retention rate: 85%' },
//     //     success: true,
//     //     timestamp: '2024-01-15T10:30:00.000Z'
//     //   }
//     // }
//   };

//   // 示例 6: 处理不同类型的消息
//   const handleMessageByType = (message: any) => {
//     switch (message.type) {
//       case 'user':
//         console.log('处理用户消息:', message.content);
//         break;
//       case 'assistant':
//         console.log('处理助手回复:', message.content);
//         if (message.metadata?.confidence) {
//           console.log('置信度:', message.metadata.confidence);
//         }
//         break;
//       case 'system':
//         console.log('处理系统消息:', message.content);
//         if (message.metadata?.priority === 'critical') {
//           console.warn('关键系统消息!');
//         }
//         break;
//       case 'developer':
//         console.log('处理开发者消息:', message.content);
//         if (message.metadata?.debugInfo) {
//           console.debug('调试信息:', message.metadata.debugInfo);
//         }
//         break;
//       case 'tool':
//         console.log('处理工具消息:', message.content);
//         if (!message.metadata?.success) {
//           console.error('工具执行失败:', message.metadata?.errorMessage);
//         }
//         break;
//       default:
//         console.log('未知消息类型:', message);
//     }
//   };

//   // 示例 7: 批量处理聊天历史
//   const analyzeConversation = () => {
//     const userMessages = chatHistory.filter(msg => msg.type === 'user');
//     const assistantMessages = chatHistory.filter(msg => msg.type === 'assistant');
//     const systemMessages = chatHistory.filter(msg => msg.type === 'system');
//     const toolMessages = chatHistory.filter(msg => msg.type === 'tool');
//     const developerMessages = chatHistory.filter(msg => msg.type === 'developer');

//     console.log('对话分析:', {
//       totalMessages: chatHistory.length,
//       userMessages: userMessages.length,
//       assistantMessages: assistantMessages.length,
//       systemMessages: systemMessages.length,
//       toolMessages: toolMessages.length,
//       developerMessages: developerMessages.length
//     });

//     // 分析助手消息的平均置信度
//     const assistantConfidences = assistantMessages
//       .filter((msg): msg is import('./useChat').AssistantMessage => msg.type === 'assistant')
//       .map(msg => msg.metadata?.confidence)
//       .filter(confidence => confidence !== undefined) as number[];
    
//     if (assistantConfidences.length > 0) {
//       const avgConfidence = assistantConfidences.reduce((sum, conf) => sum + conf, 0) / assistantConfidences.length;
//       console.log('助手回复平均置信度:', avgConfidence.toFixed(2));
//     }

//     // 统计工具执行成功率
//     const toolSuccessRate = toolMessages.length > 0 
//       ? toolMessages.filter(msg => msg.metadata?.success).length / toolMessages.length
//       : 0;
//     console.log('工具执行成功率:', (toolSuccessRate * 100).toFixed(1) + '%');
//   };

//   return {
//     handleUserInput,
//     handleAssistantResponse,
//     handleSystemNotification,
//     handleDebugInfo,
//     handleToolExecution,
//     handleMessageByType,
//     analyzeConversation
//   };
// };

// // 类型守卫函数示例
// export const isUserMessage = (message: any): message is import('./useChat').UserMessage => {
//   return message.type === 'user';
// };

// export const isAssistantMessage = (message: any): message is import('./useChat').AssistantMessage => {
//   return message.type === 'assistant';
// };

// export const isSystemMessage = (message: any): message is import('./useChat').SystemMessage => {
//   return message.type === 'system';
// };

// export const isDeveloperMessage = (message: any): message is import('./useChat').DeveloperMessage => {
//   return message.type === 'developer';
// };

// export const isToolMessage = (message: any): message is import('./useChat').ToolMessage => {
//   return message.type === 'tool';
// };

// // 消息过滤器示例
// export const MessageFilters = {
//   // 获取所有用户消息
//   getUserMessages: (messages: import('./useChat').Message[]) => 
//     messages.filter(isUserMessage),

//   // 获取高置信度的助手消息
//   getHighConfidenceAssistantMessages: (messages: import('./useChat').Message[], threshold = 0.8) =>
//     messages.filter(msg => 
//       isAssistantMessage(msg) && 
//       msg.metadata?.confidence && 
//       msg.metadata.confidence >= threshold
//     ),

//   // 获取关键系统消息
//   getCriticalSystemMessages: (messages: import('./useChat').Message[]) =>
//     messages.filter(msg => 
//       isSystemMessage(msg) && 
//       msg.metadata?.priority === 'critical'
//     ),

//   // 获取失败的工具消息
//   getFailedToolMessages: (messages: import('./useChat').Message[]) =>
//     messages.filter(msg => 
//       isToolMessage(msg) && 
//       msg.metadata?.success === false
//     ),

//   // 获取包含调试信息的开发者消息
//   getDeveloperMessagesWithDebugInfo: (messages: import('./useChat').Message[]) =>
//     messages.filter(msg => 
//       isDeveloperMessage(msg) && 
//       msg.metadata?.debugInfo
//     )
// };