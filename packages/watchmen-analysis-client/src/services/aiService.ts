import { Message } from '@/components/ai/AIMessage';
import { BusinessContext } from '@/model/analysis';
import { HypothesisType } from '@/model/Hypothesis';
import { generatePrimeSync } from 'crypto';

export type AIMode = 'hypothesis-analysis' | 'challenge-monitor';

interface AIResponse {
  content: string;
  role: 'ai' | 'user';
  timestamp: Date;
  format?: 'text' | 'markdown';
}

const WELCOME_MESSAGES = {
  'hypothesis-analysis': 'Welcome to Hypothesis Analysis! I can help you validate and analyze your business hypotheses.',
  'challenge-monitor': 'Welcome to Challenge Monitor! I can help you track and analyze business challenges.',
  'improvement-actions': 'Welcome to Improvement Actions! I can help you generate data-driven recommendations.'
};

const generateResponse = async (message: string, mode: AIMode): Promise<AIResponse> => {
  // TODO: Implement actual API call to your AI backend
  // This is a placeholder implementation
  let response = '';
  
  switch (mode) {
    case 'hypothesis-analysis':
      response = `## Analysis Results\n\nBased on the analysis of your hypothesis "${message}", here are my findings:\n\n- Point 1\n- Point 2\n- Point 3`;
      break;
    case 'challenge-monitor':
      response = `## Challenge Analysis\n\nRegarding the business challenge "${message}", I've identified the following patterns:\n\n1. Pattern One\n2. Pattern Two\n3. Pattern Three`;
      break;
    default:
      response = '## Analysis\n\nI understand your query. Let me analyze that for you...';
  }

  return {
    content: response,
    role: 'ai',
    timestamp: new Date(),
    format: 'markdown'
  };
};

export const aiService = {
  getWelcomeMessage: (mode: AIMode): string => WELCOME_MESSAGES[mode],
  
  processMessage: async (message: string, mode: AIMode): Promise<Message> => {
    const response = await generateResponse(message, mode);
    return {
      id: Date.now().toString(),
      content: response.content,
      role: response.role,
      timestamp: response.timestamp
    };
  },

  generateInsights: async (hypothesis: HypothesisType, businessContext: BusinessContext): Promise<Message> => {
    const response = await generateResponse(`Hypothesis: ${hypothesis?.description || ''}, Context: ${businessContext}`, 'hypothesis-analysis');
    return {
      id: Date.now().toString(),
      content: response.content,
      role: response.role,
      timestamp: response.timestamp
    };
  }
};