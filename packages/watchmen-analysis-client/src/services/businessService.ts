
import { BusinessChallenge, BusinessChallengeWithProblems, BusinessProblem } from "@/model/business";
import { HypothesisType } from '@/model/Hypothesis';
import { API_BASE_URL, getDefaultHeaders, checkResponse } from '@/utils/apiConfig';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isMockMode = import.meta.env.VITE_USE_MOCK_DATA === 'true';

// Mock business challenges
const mockBusinessChallenges: BusinessChallenge[] = [
  {
    id: 'bc1',
    title: 'Improve Customer Retention Rate',
    description: 'In a competitive market, improving customer lifetime value and retention rate is key to company growth.',
    problemIds: ['bp1', 'bp2'],
    createdAt: '2023-10-15T08:00:00Z',
  },
  {
    id: 'bc2',
    title: 'Optimize Marketing Efficiency',
    description: 'Improve marketing ROI, reduce customer acquisition costs, and enhance brand influence.',
    problemIds: ['bp3'],
    createdAt: '2023-11-01T09:30:00Z',
  },
  {
    id: 'bc3',
    title: 'Increase Cross-selling Rate',
    description: 'Increase product holdings of existing customers and improve average revenue per customer.',
    problemIds: ['bp4'],
    createdAt: '2023-11-10T14:45:00Z',
  }
];

// Mock business problems
const mockBusinessProblems: BusinessProblem[] = [
  {
    id: 'bp1',
    title: 'High-value Customer Churn Issue',
    description: 'High-value customer churn rate exceeds industry average, requiring root cause analysis and intervention strategies.',
    status: 'in_progress',
    // metrics: ['Churn Rate', 'Customer Lifetime Value'],
    hypothesisIds: ['1', '2'],
    createdAt: '2023-10-20T10:15:00Z',
  },
  {
    id: 'bp2',
    title: 'Declining Renewal Rate Trend',
    description: 'Renewal rates show a downward trend over the past two quarters, affecting long-term revenue stability.',
    status: 'open',
    hypothesisIds: ['3'],
    createdAt: '2023-10-25T16:30:00Z',
  },
  {
    id: 'bp3',
    title: 'Marketing Channel Efficiency Variance',
    description: 'Significant differences in customer acquisition costs and quality across marketing channels require resource allocation optimization.',
    status: 'in_progress',
    hypothesisIds: ['5'],
    createdAt: '2023-11-05T11:45:00Z',
  },
  {
    id: 'bp4',
    title: 'Low Cross-selling Conversion Rate',
    description: 'Existing customers show lower than expected purchase rates for additional products, impacting customer value maximization.',
    status: 'open',
    hypothesisIds: ['4', '6'],
    createdAt: '2023-11-12T09:20:00Z',
  }
];

export class BusinessService {
  // Mock data
  private mockBusinessChallenges: BusinessChallenge[] = mockBusinessChallenges;
  private mockBusinessProblems: BusinessProblem[] = mockBusinessProblems;

  // Challenges
  async getChallenges(): Promise<BusinessChallenge[]> {
    // if (isMockMode) {
    //   await delay(500);
    //   return this.mockBusinessChallenges;
    // }
    try {
      const response = await fetch(`${API_BASE_URL}/watchmen/ai/challenges`, {
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
    //     problemIds: [],
    //     createdAt: new Date().toISOString(),
    //   };
    //   return newChallenge;
    // }
    try {
      const response = await fetch(`${API_BASE_URL}/watchmen/ai/challenge/create`, {
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
      const response = await fetch(`${API_BASE_URL}/watchmen/ai/challenge/update`, {
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

  async getBusinessChallengeById(challenge_id: string): Promise<BusinessChallengeWithProblems | undefined>  {
    // if (isMockMode) {
    //   return mockBusinessChallenges.find(bc => bc.id === challenge_id);
    // }
    try {
      const response = await fetch(`${API_BASE_URL}/watchmen/ai/challenge/${challenge_id}`, {
        headers: getDefaultHeaders()
      });
      return await checkResponse(response);
    } catch (error) {
      console.error('Error fetching challenge:', error);
      throw error;
    }
  };

    async getFullBusinessChallengeById(challenge_id: string): Promise<BusinessChallengeWithProblems | undefined>  {
    // if (isMockMode) {
    //   return mockBusinessChallenges.find(bc => bc.id === challenge_id);
    // }
    try {
      const response = await fetch(`${API_BASE_URL}/watchmen/ai/challenge/full/${challenge_id}`, {
        headers: getDefaultHeaders()
      });
      return await checkResponse(response);
    } catch (error) {
      console.error('Error fetching challenge:', error);
      throw error;
    }
  };


  // Problems
  async getProblems(): Promise<BusinessProblem[]> {
    // if (isMockMode) {
    //   await delay(500);
    //   return this.mockBusinessProblems;
    // }
    try {
      const response = await fetch(`${API_BASE_URL}/watchmen/ai/problems`, {
        headers: getDefaultHeaders()
      });
      return await checkResponse(response);
    } catch (error) {
      console.error('Error fetching problems:', error);
      throw error;
    }
  }
  
  async getBusinessProblemById(id: string): Promise<BusinessProblem | null> {
    // if (isMockMode) {
    //   await delay(300);
    //   const problem = this.mockBusinessProblems.find(p => p.id === id);
    //   return problem || null;
    // }
    try {
      const response = await fetch(`${API_BASE_URL}/watchmen/ai/problems/${id}`, {
        headers: getDefaultHeaders()
      });
      return await checkResponse(response);
    } catch (error) {
      console.error('Error fetching problem:', error);
      return null;
    }
  }

  async createProblem(data: Partial<BusinessProblem>): Promise<BusinessProblem> {
    // if (isMockMode) {
    //   await delay(500);
    //   const newProblem: BusinessProblem = {
    //     id: Date.now().toString(),
    //     title: data.title || '',
    //     description: data.description || '',
    //     status: data.status as 'open' | 'in_progress' | 'resolved' || 'open',
    //     hypothesisIds: [],
    //     createdAt: new Date().toISOString(),
    //   };
    //   return newProblem;
    // }
    try {
      const response = await fetch(`${API_BASE_URL}/watchmen/ai/problem/create`, {
        method: 'POST',
        headers: getDefaultHeaders(),
        body: JSON.stringify(data),
      });
      return await checkResponse(response);
    } catch (error) {
      console.error('Error creating problem:', error);
      throw error;
    }
  }

  async updateProblem(id: string, data: Partial<BusinessProblem>): Promise<BusinessProblem> {
    // if (isMockMode) {
    //   await delay(500);
    //   const problem = this.mockBusinessProblems.find(p => p.id === id);
    //   if (!problem) {
    //     throw new Error('Problem not found');
    //   }
    //   return { ...problem, ...data };
    // }
    console.log(data);
    try {
      const response = await fetch(`${API_BASE_URL}/watchmen/ai/problem/update`, {
        method: 'POST',
        headers: getDefaultHeaders(),
        body: JSON.stringify(data),
      });
      return await checkResponse(response);
    } catch (error) {
      console.error('Error updating problem:', error);
      throw error;
    }
  }

  // Helper methods
  async getProblemsForChallenge(challengeId: string): Promise<BusinessProblem[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/watchmen/ai/challenges/${challengeId}/problems`, {
        headers: getDefaultHeaders()
      });
      return await checkResponse(response);
    } catch (error) {
      console.error('Error fetching problems for challenge:', error);
      throw error;
    }
  }


}

export const businessService = new BusinessService();
