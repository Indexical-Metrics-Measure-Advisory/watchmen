
import { HypothesisType, Insight } from '@/model/Hypothesis';
import { MetricType } from '@/model/Metric';
import { API_BASE_URL, getDefaultHeaders, checkResponse } from '@/utils/apiConfig';

const isMockMode = import.meta.env.VITE_USE_MOCK_DATA === 'true';

console.log('isMockMode:', isMockMode);

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
    businessProblemId: 'bp1',
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
    businessProblemId: 'bp1',
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
    businessProblemId: 'bp2',
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
    businessProblemId: 'bp4'
  },
  {
    id: '5',
    title: 'Marketing Campaign ROI Optimization',
    description: 'Analyze ROI of different marketing channels and campaigns to identify the most effective customer acquisition strategies.',
    status: 'testing',
    confidence: 68,
    metrics: ['Customer Acquisition Cost', 'Conversion Rate', 'Marketing Spend'],
    createdAt: '2023-10-22T11:10:00Z',
    businessProblemId: 'bp3',
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
    businessProblemId: 'bp4',
    relatedHypothesesIds: ['2']
  }
];

const keyMetrics: MetricType[] = [
  {
    id: '1',
    name: 'Customer Acquisition Cost',
    value: 2850,
    unit: '¥',
    change: -5.3,
    status: 'positive',
    description: 'Average cost to acquire a new customer',
    lastUpdated: '2023-11-12T14:30:00Z',
    // category: ,
  },
  {
    id: '2',
    name: 'Policy Renewal Rate',
    value: 83.7,
    unit: '%',
    change: 2.1,
    status: 'positive',
    description: 'Percentage of customers who renew their policies upon expiration',
    lastUpdated: '2023-11-12T14:30:00Z',
    // category: 'retention',
  },
  {
    id: '3',
    name: 'Claims Processing Time',
    value: 7.2,
    unit: 'days',
    change: -15.3,
    status: 'positive',
    description: 'Average time from claim submission to settlement',
    lastUpdated: '2023-11-11T09:45:00Z',
    category: 'Ratio',
  },
  {
    id: '4',
    name: 'Product Cross-Sell Rate',
    value: 24.8,
    unit: '%',
    change: -1.2,
    status: 'negative',
    description: 'Percentage of customers with multiple products',
    lastUpdated: '2023-11-10T11:30:00Z',
    category: 'Ratio',
  },
];


const insights: Insight[] = [
  {
    title: 'Rising Customer Churn Risk',
    description: 'High-value customer churn rate increased by 3.2% in the last 30 days. Analysis and intervention recommended.',

    type: 'risk',
    priority: 'high',
  },
  {
    title: 'Product Recommendation Efficiency Improvement',
    description: 'ML-based product recommendation system improved conversion rate by 15%. Further algorithm optimization may bring more growth.',
    type: 'trendup',
    priority: 'medium',
  },
];




// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Define the interface for hypothesis service
interface IHypothesisService {
  getHypotheses(): Promise<HypothesisType[]>;
  getHypothesesByProblemId(problemId: string): Promise<HypothesisType[]>;
  getHypothesisById(id: string): Promise<HypothesisType | undefined>;
  createHypothesis(data: Partial<HypothesisType>): Promise<HypothesisType>;
  updateHypothesis(id: string, data: Partial<HypothesisType>): Promise<HypothesisType>;
  deleteHypothesis(id: string): Promise<void>;
  resetHypotheses(): Promise<HypothesisType[]>;
  find_recent_hypotheses(): Promise<HypothesisType[]>;
  get_related_hypotheses(hypothesisId: string): Promise<HypothesisType[]>;
}


// Hypothesis Service Implementation

class HypothesisService implements IHypothesisService {
  get_related_hypotheses(hypothesisId: string): Promise<HypothesisType[]> {
    throw new Error('Method not implemented.');
  }

  async getHypothesesByProblemId(problemId: string): Promise<HypothesisType[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/watchmen/ai/problems/${problemId}/hypotheses`, {
        headers: getDefaultHeaders()
      });
      return await checkResponse(response);
    } catch (error) {
      console.error('Error fetching hypotheses for problem:', error);
      throw error;
    }
  }

  async getHypotheses(): Promise<HypothesisType[]> {
    // if (isMockMode) {
    //   await delay(500);
    //   return initialMockHypotheses;
    // }
    try {
      const response = await fetch(`${API_BASE_URL}/watchmen/ai/hypotheses`, {
        headers: getDefaultHeaders()
      });
      return await checkResponse(response);
    } catch (error) {
      console.error('Error fetching hypotheses:', error);
      throw error;
    }
  }

  async getKeyMetrics(): Promise<MetricType[]> {
    if (isMockMode) {
      await delay(500);
      return keyMetrics;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/watchmen/ai/metrics/key`, {
        headers: getDefaultHeaders()
      });
      return await checkResponse(response);
    } catch (error) {
      console.error('Error fetching key metrics:', error);
      throw error;
    }
  }

  async getInsights(): Promise<Insight[]> {
    if (isMockMode) {
      await delay(500);
      return insights;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/watchmen/ai/insights`, {
        headers: getDefaultHeaders()
      });
      return await checkResponse(response);
    } catch (error) {
      console.error('Error fetching insights:', error);
      throw error;
    }
  }

  async getHypothesisById(hypothesis_id: string): Promise<HypothesisType | undefined> {
    if (isMockMode) {
      await delay(300);
      return initialMockHypotheses.find(h => h.id === hypothesis_id);
    }
    try {
      const response = await fetch(`${API_BASE_URL}/watchmen/ai/hypothesis/${hypothesis_id}`, {
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
        businessProblemId: data.businessProblemId,
        relatedHypothesesIds: data.relatedHypothesesIds || [],
        analysisMethod: data.analysisMethod || 'Trend Analysis'
      };

      initialMockHypotheses = [newHypothesis, ...initialMockHypotheses];

      if (newHypothesis.businessProblemId) {
        console.log(`Added hypothesis ${newHypothesis.id} to problem ${newHypothesis.businessProblemId}`);
      }

      return newHypothesis;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/watchmen/ai/hypothesis/create`, {
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
    const response = await fetch(`${API_BASE_URL}/watchmen/ai/hypothesis/update`, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify(data),
    });
    return await checkResponse(response);
  } catch (error) {
    console.error('Error updating hypothesis:', error);
    throw error;
  }
  }

  async deleteHypothesis(id: string): Promise<void> {
    // if (isMockMode) {
    //   await delay(500);
    //   initialMockHypotheses = initialMockHypotheses.filter(h => h.id !== id);
    //   return;
    // }
    try {
      const response = await fetch(`${API_BASE_URL}/watchmen/ai/hypotheses/${id}`, {
        method: 'DELETE',
        headers: getDefaultHeaders()
      });
      return await checkResponse(response);
    } catch (error) {
      console.error('Error deleting hypothesis:', error);
      throw error;
    }
  }

  async resetHypotheses(): Promise<HypothesisType[]> {
    await delay(300);
    // mockHypotheses = updateMockHypotheses([...initialMockHypotheses]);
    return initialMockHypotheses;
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
  }
}

// Export a singleton instance
export const hypothesisService = new HypothesisService();
