import { HypothesisContext } from '@/model/Hypothesis';
import { API_BASE_URL, getDefaultHeaders, checkResponse, API_AI_URL } from '@/utils/apiConfig';

interface GenerateHypothesisResponse {
    reasoning: string;
    response: {
        hypothesis: string;
        description: string;
        evidence: string;
        analysisMethod: string;
        result: string;
    }
}

// interface GenerateHypothesisRequest {
//   challengeId: string;
// }

export interface DraftHypothesisResponse {
  success: boolean;
  title?: string;
  description?: string;
  analysisMethod?: string;
  message?: string;
}

class AIHypothesisService {
  async generateHypothesis(challengeId: string): Promise<GenerateHypothesisResponse> {
    try {
      const response = await fetch(`${API_AI_URL}/ai/generate-hypothesis`, {
        method: 'POST',
        headers: getDefaultHeaders(),
        body: JSON.stringify({ challengeId })
      });
      
      return await checkResponse(response);
    } catch (error) {
      console.error('Error generating hypothesis:', error);
      throw error;
    }
  }

  async draftHypothesis(context: HypothesisContext): Promise<DraftHypothesisResponse> {
    try {
      const response = await fetch(`${API_AI_URL}/ai/draft-hypothesis`, {
        method: 'POST',
        headers: getDefaultHeaders(),
        body: JSON.stringify(context)
      });

      return await checkResponse(response);
    } catch (error) {
      console.error('Error drafting hypothesis:', error);
      throw error;
    }
  }
}

export const aiHypothesisService = new AIHypothesisService();