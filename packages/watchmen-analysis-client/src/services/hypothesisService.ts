
import { HypothesisType } from '@/model/Hypothesis';
import { API_BASE_URL, getDefaultHeaders, checkResponse, API_AI_URL } from '@/utils/apiConfig';

const isMockMode = import.meta.env.VITE_USE_MOCK_DATA === 'true';

// Mock data for initial load
let initialMockHypotheses: HypothesisType[] = [
  {
    id: '1',
    title: 'Age Group and Insurance Purchase Intent Correlation',
    description: 'Hypothesis that customer age groups have a significant correlation with their willingness to purchase specific insurance products, especially in the 45-60 age group.',
    status: 'testing',
    confidence: 75,
    metrics: ['Customer Acquisition Rate', 'Conversion Rate', 'Age Distribution'],
    createdAt: '2023-11-10T10:30:00Z',
    businessChallengeId: 'bc1',
    relatedHypothesesIds: ['3', '5']
  },
  {
    id: '2',
    title: 'High-Value Customer Churn Prediction Model',
    description: 'Through historical data and customer behavior patterns, we can predict the churn risk of high-value customers and take targeted intervention measures.',
    status: 'validated',
    confidence: 92,
    metrics: ['Customer Retention Rate', 'Customer Value', 'Interaction Frequency'],
    createdAt: '2023-11-05T08:15:00Z',
    businessChallengeId: 'bc1',
    relatedHypothesesIds: ['6']
  },
  {
    id: '3',
    title: 'Pricing Strategy Impact on Renewal Rate',
    description: 'Evaluate the impact of different pricing strategies on customer renewal decisions to determine optimal price points that balance revenue maximization and customer retention.',
    status: 'drafted',
    confidence: 45,
    metrics: ['Renewal Rate', 'Price Sensitivity', 'Customer Satisfaction'],
    createdAt: '2023-11-01T15:45:00Z',
    businessChallengeId: 'bc1',
    relatedHypothesesIds: ['1']
  },
  {
    id: '4',
    title: 'Customer Service Channel Preference Analysis',
    description: 'Study service channel preferences across different customer segments to optimize customer service resource allocation and improve satisfaction.',
    status: 'rejected',
    confidence: 30,
    metrics: ['Customer Satisfaction', 'Channel Usage Rate', 'Issue Resolution Time'],
    createdAt: '2023-10-28T09:20:00Z',
    businessChallengeId: 'bc3'
  },
  {
    id: '5',
    title: 'Marketing Campaign ROI Optimization',
    description: 'Analyze ROI of different marketing channels and campaigns to identify the most effective customer acquisition strategies.',
    status: 'testing',
    confidence: 68,
    metrics: ['Customer Acquisition Cost', 'Conversion Rate', 'Marketing Spend'],
    createdAt: '2023-10-22T11:10:00Z',
    businessChallengeId: 'bc2',
    relatedHypothesesIds: ['1']
  },
  {
    id: '6',
    title: 'Claims Frequency and Customer Characteristics Relationship',
    description: 'Explore the relationship between customer demographics, behavioral characteristics, and claims frequency to improve risk assessment models.',
    status: 'validated',
    confidence: 88,
    metrics: ['Claims Frequency', 'Customer Risk Score', 'Claims Amount'],
    createdAt: '2023-10-15T14:30:00Z',
    businessChallengeId: 'bc3',
    relatedHypothesesIds: ['2']
  }
];





// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Define the interface for hypothesis service
interface IHypothesisService {
  getHypotheses(): Promise<HypothesisType[]>;
  getHypothesesByChallengeId(challengeId: string): Promise<HypothesisType[]>;
  getHypothesisById(id: string): Promise<HypothesisType | undefined>;
  createHypothesis(data: Partial<HypothesisType>): Promise<HypothesisType>;
  updateHypothesis(id: string, data: Partial<HypothesisType>): Promise<HypothesisType>;
  deleteHypothesis(id: string): Promise<void>;
  find_recent_hypotheses(): Promise<HypothesisType[]>;
}


// Hypothesis Service Implementation

class HypothesisService implements IHypothesisService {
  async getHypothesesByChallengeId(challengeId: string): Promise<HypothesisType[]> {
    try {
      const response = await fetch(`${API_AI_URL}/challenges/${challengeId}/hypotheses`, {
        headers: getDefaultHeaders()
      });
      return await checkResponse(response);
    } catch (error) {
      console.error('Error fetching hypotheses for challenge:', error);
      throw error;
    }
  }

  async getHypotheses(): Promise<HypothesisType[]> {
    try {
      const response = await fetch(`${API_AI_URL}/hypotheses`, {
        headers: getDefaultHeaders()
      });
      return await checkResponse(response);
    } catch (error) {
      console.error('Error fetching hypotheses:', error);
      throw error;
    }
  }

  async getHypothesisById(hypothesis_id: string): Promise<HypothesisType | undefined> {
    if (isMockMode) {
      await delay(300);
      return initialMockHypotheses.find(h => h.id === hypothesis_id);
    }
    try {
      const response = await fetch(`${API_AI_URL}/hypothesis/${hypothesis_id}`, {
        headers: getDefaultHeaders()
      });
      return await checkResponse(response);
    } catch (error) {
      console.error('Error fetching hypothesis:', error);
      throw error;
    }
  }


  async createHypothesis(data: Partial<HypothesisType>): Promise<HypothesisType> {
    if (isMockMode) {
      await delay(500);
      const newHypothesis: HypothesisType = {
        id: Date.now().toString(),
        title: data.title || '',
        description: data.description || '',
        status: data.status as "drafted" | "testing" | "validated" | "rejected" || 'drafted',
        confidence: data.confidence || 0,
        metrics: data.metrics || [],
        createdAt: new Date().toISOString(),
        businessChallengeId: data.businessChallengeId,
        relatedHypothesesIds: data.relatedHypothesesIds || [],
        analysisMethod: data.analysisMethod || 'Trend Analysis'
      };

      initialMockHypotheses = [newHypothesis, ...initialMockHypotheses];

      if (newHypothesis.businessChallengeId) {
        console.log(`Added hypothesis ${newHypothesis.id} to challenge ${newHypothesis.businessChallengeId}`);
      }

      return newHypothesis;
    }
    try {
      const response = await fetch(`${API_AI_URL}/hypothesis/create`, {
        method: 'POST',
        headers: getDefaultHeaders(),
        body: JSON.stringify(data),
      });
      return await checkResponse(response);
    } catch (error) {
      console.error('Error creating hypothesis:', error);
      throw error;
    }
  }

  async updateHypothesis(id: string, data: Partial<HypothesisType>): Promise<HypothesisType> {
    if (isMockMode) {
      await delay(500);
      const index = initialMockHypotheses.findIndex(h => h.id === id);
      if (index === -1) throw new Error('Hypothesis not found');
      
      const updatedHypothesis = {
        ...initialMockHypotheses[index],
        ...data,
        updatedAt: new Date().toISOString()
      };
      
      initialMockHypotheses[index] = updatedHypothesis;
      return updatedHypothesis;
    }
  try {
    const response = await fetch(`${API_AI_URL}/hypothesis/update`, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify({ ...data, id }),
    });
    return await checkResponse(response);
  } catch (error) {
    console.error('Error updating hypothesis:', error);
    throw error;
  }
  }

  async deleteHypothesis(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_AI_URL}/hypothesis/${id}`, {
        method: 'DELETE',
        headers: getDefaultHeaders()
      });
      return await checkResponse(response);
    } catch (error) {
      console.error('Error deleting hypothesis:', error);
      throw error;
    }
  }

  async find_recent_hypotheses(): Promise<HypothesisType[]> {
    if (isMockMode) {
      await delay(300);
      const recentHypotheses: HypothesisType[] = [
        {
          id: '1',
          title: 'Age Group and Insurance Purchase Intent Correlation',
          description: 'Hypothesis that customer age groups have a significant correlation with their willingness to purchase specific insurance products, especially in the 45-60 age group.',
          status: 'testing',
          confidence: 75,
          metrics: ['Customer Acquisition Rate', 'Conversion Rate', 'Age Distribution'],
          createdAt: '2023-11-10T10:30:00Z',
        },
        {
          id: '2',
          title: 'High-Value Customer Churn Prediction Model',
          description: 'Through historical data and customer behavior patterns, we can predict the churn risk of high-value customers and take targeted intervention measures.',
          status: 'validated',
          confidence: 92,
          metrics: ['Customer Retention Rate', 'Customer Value', 'Interaction Frequency'],
          createdAt: '2023-11-05T08:15:00Z',
        },
      ];
      return recentHypotheses;
    }
    try {
      const response = await fetch(`${API_AI_URL}/hypothesis/recent`, {
        headers: getDefaultHeaders()
      });
      return await checkResponse(response);
    } catch (error) {
      console.error('Error fetching recent hypotheses:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const hypothesisService = new HypothesisService();
