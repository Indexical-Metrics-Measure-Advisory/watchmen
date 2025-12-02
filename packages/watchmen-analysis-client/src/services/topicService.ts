import { API_BASE_URL } from '@/utils/apiConfig';

// Topic interface based on actual API response structure
export interface TopicFactor {
  factorId: string;
  type: string;
  name: string;
  enumId: string | null;
  label: string;
  description: string;
  defaultValue: any;
  flatten: any;
  indexGroup: any;
  encrypt: any;
  precision: any;
}

export interface TopicData {
  version: number;
  createdAt: string;
  createdBy: string;
  lastModifiedAt: string;
  lastModifiedBy: string;
  tenantId: string;
  topicId: string;
  name: string;
  type: string;
  kind: string;
  dataSourceId: string;
  factors: TopicFactor[];
  description: string;
}

export interface TopicResponse {
  topic: TopicData;
  classification: string;
}

// Simplified interface for UI display
export interface Topic {
  id: string;
  name: string;
  description: string;
  type: string;
  kind: string;
  classification: string;
  createdAt: string;
  lastModifiedAt: string;
}

class TopicService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Get datamart topics from /topics/mart endpoint
   */
  async getDatamartTopics(): Promise<Topic[]> {
    try {
      const response = await fetch(`${this.baseUrl}/watchmen/metric/topics/mart`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add authorization header if needed
          ...(this.getAuthHeaders())
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch datamart topics: ${response.statusText}`);
      }

      const topicResponses: TopicResponse[] = await response.json();
      
      // Transform the API response to our simplified Topic interface
      return topicResponses.map(item => ({
        id: item.topic.topicId,
        name: item.topic.name,
        description: item.topic.description,
        type: item.topic.type,
        kind: item.topic.kind,
        classification: item.classification,
        createdAt: item.topic.createdAt,
        lastModifiedAt: item.topic.lastModifiedAt
      }));
    } catch (error) {
      console.error('Error fetching datamart topics:', error);
      // Return mock data for development/testing
      // return this.getMockTopics();
      return  []
    }
  }

  /**
   * Get authorization headers if user is authenticated
   */
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('authToken');
    if (token) {
      return {
        'Authorization': `Bearer ${token}`
      };
    }
    return {};
  }

  /**
   * Mock data for development/testing based on actual API structure
   */
  private getMockTopics(): Topic[] {
    return [
      {
        id: 'customer-data-mart',
        name: 'Customer Data Mart',
        description: 'Customer demographics and behavior data',
        type: 'datamart',
        kind: 'business',
        classification: 'dm',
        createdAt: '2024-01-01T00:00:00Z',
        lastModifiedAt: '2024-01-15T10:30:00Z'
      },
      {
        id: 'policy-data-mart',
        name: 'Policy Data Mart',
        description: 'Insurance policy information and metrics',
        type: 'datamart',
        kind: 'business',
        classification: 'dm',
        createdAt: '2024-01-01T00:00:00Z',
        lastModifiedAt: '2024-01-15T10:30:00Z'
      },
      {
        id: 'claims-data-mart',
        name: 'Claims Data Mart',
        description: 'Claims processing and analytics data',
        type: 'datamart',
        kind: 'business',
        classification: 'dm',
        createdAt: '2024-01-01T00:00:00Z',
        lastModifiedAt: '2024-01-15T10:30:00Z'
      },
      {
        id: 'financial-data-mart',
        name: 'Financial Data Mart',
        description: 'Financial metrics and reporting data',
        type: 'datamart',
        kind: 'business',
        classification: 'dm',
        createdAt: '2024-01-01T00:00:00Z',
        lastModifiedAt: '2024-01-15T10:30:00Z'
      },
      {
        id: 'risk-assessment-mart',
        name: 'Risk Assessment Data Mart',
        description: 'Risk analysis and underwriting data',
        type: 'datamart',
        kind: 'business',
        classification: 'dm',
        createdAt: '2024-01-01T00:00:00Z',
        lastModifiedAt: '2024-01-15T10:30:00Z'
      }
    ];
  }
}

// Export singleton instance
export const topicService = new TopicService();