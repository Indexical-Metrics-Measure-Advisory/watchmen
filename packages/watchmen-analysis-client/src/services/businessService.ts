
import { BusinessChallenge, BusinessChallengeWithHypotheses } from "@/model/business";
import { API_BASE_URL, getDefaultHeaders, checkResponse, API_AI_URL } from '@/utils/apiConfig';

const isMockMode = import.meta.env.VITE_USE_MOCK_DATA === 'true';

// Mock business challenges
const mockBusinessChallenges: BusinessChallenge[] = [
  {
    id: 'bc1',
    title: 'Improve Customer Retention Rate',
    description: 'In a competitive market, improving customer lifetime value and retention rate is key to company growth.',
    createdAt: '2023-10-15T08:00:00Z',
  },
  {
    id: 'bc2',
    title: 'Optimize Marketing Efficiency',
    description: 'Improve marketing ROI, reduce customer acquisition costs, and enhance brand influence.',
    createdAt: '2023-11-01T09:30:00Z',
  },
  {
    id: 'bc3',
    title: 'Increase Cross-selling Rate',
    description: 'Increase product holdings of existing customers and improve average revenue per customer.',
    createdAt: '2023-11-10T14:45:00Z',
  }
];

export class BusinessService {
  // Mock data
  private mockBusinessChallenges: BusinessChallenge[] = mockBusinessChallenges;

  // Challenges
  async getChallenges(): Promise<BusinessChallenge[]> {
    // if (isMockMode) {
    //   await delay(500);
    //   return this.mockBusinessChallenges;
    // }
    try {
      const response = await fetch(`${API_AI_URL}/challenges`, {
        headers: getDefaultHeaders()
      });
      return await checkResponse(response);
    } catch (error) {
      console.error('Error fetching challenges:', error);
      throw error;
    }
  }

  async createChallenge(data: Partial<BusinessChallenge>): Promise<BusinessChallenge> {
    // if (isMockMode) {
    //   await delay(500);
    //   const newChallenge: BusinessChallenge = {
    //     id: Date.now().toString(),
    //     title: data.title || '',
    //     description: data.description || '',
    //     createdAt: new Date().toISOString(),
    //   };
    //   return newChallenge;
    // }
    try {
      const response = await fetch(`${API_AI_URL}/challenge/create`, {
        method: 'POST',
        headers: getDefaultHeaders(),
        body: JSON.stringify(data),
      });
      return await checkResponse(response);
    } catch (error) {
      console.error('Error creating challenge:', error);
      throw error;
    }
  }

  async updateChallenge(id: string, data: Partial<BusinessChallenge>): Promise<BusinessChallenge> {
    // if (isMockMode) {
    //   await delay(500);
    //   const challenge = this.mockBusinessChallenges.find(c => c.id === id);
    //   if (!challenge) {
    //     throw new Error('Challenge not found');
    //   }
    //   return { ...challenge, ...data };
    // }
    try {
      const response = await fetch(`${API_AI_URL}/challenge/update`, {
        method: 'POST',
        headers: getDefaultHeaders(),
        body: JSON.stringify(data),
      });
      return await checkResponse(response);
    } catch (error) {
      console.error('Error updating challenge:', error);
      throw error;
    }
  }

  async getBusinessChallengeById(challenge_id: string): Promise<BusinessChallenge | undefined>  {
    // if (isMockMode) {
    //   return mockBusinessChallenges.find(bc => bc.id === challenge_id);
    // }
    try {
      const response = await fetch(`${API_AI_URL}/challenge/${challenge_id}`, {
        headers: getDefaultHeaders()
      });
      return await checkResponse(response);
    } catch (error) {
      console.error('Error fetching challenge:', error);
      throw error;
    }
  };

    async getFullBusinessChallengeById(challenge_id: string): Promise<BusinessChallengeWithHypotheses | undefined>  {
    // if (isMockMode) {
    //   return mockBusinessChallenges.find(bc => bc.id === challenge_id);
    // }
    try {
      const response = await fetch(`${API_AI_URL}/challenge/full/${challenge_id}`, {
        headers: getDefaultHeaders()
      });
      return await checkResponse(response);
    } catch (error) {
      console.error('Error fetching challenge:', error);
      throw error;
    }
  };


}

export const businessService = new BusinessService();
