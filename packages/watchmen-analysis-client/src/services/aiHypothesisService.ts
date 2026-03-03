import { BusinessProblem } from '@/model/business';
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
//   businessProblemId: string;
//   businessProblemTitle: string;
//   businessProblemDescription: string;
// }

class AIHypothesisService {
  async generateHypothesis(businessProblem: BusinessProblem): Promise<GenerateHypothesisResponse> {
    try {
      const response = await fetch(`${API_AI_URL}/ai/generate-hypothesis`, {
        method: 'POST',
        headers: getDefaultHeaders(),
        body: JSON.stringify(businessProblem)
      });
      
      return await checkResponse(response);
    } catch (error) {
      console.error('Error generating hypothesis:', error);
      throw error;
    }
  }
}

export const aiHypothesisService = new AIHypothesisService();