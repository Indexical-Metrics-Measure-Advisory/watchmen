import { getRelevantMetrics } from '@/utils/metricsMapping';
import { aiService, AIMode } from '@/services/aiService';

const createMetricLink = (metric: string) => `[📊 ${metric}](/metrics?metric=${encodeURIComponent(metric)})`;
const createHypothesisLink = (id: string, text: string) => `[🧠 ${text}](analysis?hypothesis=${id})`;
const createChallengeLink = (id: string, text: string) => `[🎯 ${text}](/business-challenges/${id})`;

export const getAIResponse = async (userInput: string, mode: AIMode): Promise<string> => {
  // Extract hypothesis details if present in the input
  const hypothesisTitle = extractHypothesisTitle(userInput);
  const hypothesisDescription = extractHypothesisDescription(userInput);
  
  // Get relevant metrics if hypothesis details are present
  const relevantMetrics = (hypothesisTitle || hypothesisDescription) 
    ? getRelevantMetrics(hypothesisTitle || '', hypothesisDescription || '')
    : [];

  // Process the message through AI service
  const response = await aiService.processMessage(userInput, mode);
  
  // Enhance the response with metric links if available
  // if (relevantMetrics.length > 0) {
  //   const metricLinks = relevantMetrics.slice(0, 3).map(metric => createMetricLink(metric)).join(', ');
  //   return `${response.content} Key metrics to monitor: ${metricLinks}`;
  // }

  return response.content;
};

export const getWelcomeMessages = () => {
  return {
    'hypothesis-analysis': aiService.getWelcomeMessage('hypothesis-analysis'),
    'challenge-monitor': aiService.getWelcomeMessage('challenge-monitor'),
    // 'improvement-actions': aiService.getWelcomeMessage('improvement-actions')
  };
};

// Helper functions to extract hypothesis information from user input
function extractHypothesisTitle(input: string): string {
  const titleMatch = input.match(/(?:hypothesis|title):\s*([^.!?]+)[.!?]?/i);
  return titleMatch ? titleMatch[1].trim() : '';
}

function extractHypothesisDescription(input: string): string {
  const descMatch = input.match(/description:\s*([^.!?]+(?:[.!?][^.!?]+)*)/i);
  if (descMatch) return descMatch[1].trim();
  
  const titleMatch = input.match(/(?:hypothesis|title):\s*([^.!?]+)[.!?]?/i);
  if (titleMatch) {
    const remainingText = input.replace(titleMatch[0], '').trim();
    return remainingText;
  }
  
  return input;
}