import { BusinessChallenge } from '@/model/business';
import { API_BASE_URL, checkResponse, getDefaultHeaders } from '@/utils/apiConfig';



export interface AIProblemResponse {
  reasoning: string;
  response: {
      title: string;
      description: string;
      reason: string;
  }
}

export const aiProblemService = {
  generateProblem: async (challenge: BusinessChallenge): Promise<AIProblemResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/watchmen/ai/ai/generate-problem`, {
        method: 'POST',
        headers: getDefaultHeaders(),
        body: JSON.stringify(challenge),
      });

      return await checkResponse(response);
    } catch (error) {
      console.error('Error generating hypothesis:', error);
      throw error;
    }
  },
};