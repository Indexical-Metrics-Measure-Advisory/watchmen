import { MetricDimension, DimensionType } from '@/model/analysis';
import { API_BASE_URL, getDefaultHeaders, checkResponse } from '@/utils/apiConfig';

const isMockMode = import.meta.env.VITE_USE_MOCK_DATA === 'true';

// Mock dimension data for drill-down functionality
const mockDimensions: MetricDimension[] = [
  {
    name: 'Age Group',
    description: 'Customer age segments',
    qualified_name: 'customer.age_group',
    importance: 0.85,
    dimensionType: DimensionType.CATEGORICAL
  },
  {
    name: 'Product Type',
    description: 'Insurance product categories',
    qualified_name: 'product.type',
    importance: 0.78,
    dimensionType: DimensionType.CATEGORICAL
  },
  {
    name: 'Region',
    description: 'Geographic regions',
    qualified_name: 'customer.region',
    importance: 0.72,
    dimensionType: DimensionType.GEO
  },
  {
    name: 'Channel',
    description: 'Sales channels',
    qualified_name: 'sales.channel',
    importance: 0.68,
    dimensionType: DimensionType.CATEGORICAL
  },
  {
    name: 'Customer Segment',
    description: 'Customer value segments',
    qualified_name: 'customer.segment',
    importance: 0.65,
    dimensionType: DimensionType.CATEGORICAL
  },
  {
    name: 'Time Period',
    description: 'Time-based analysis',
    qualified_name: 'time.period',
    importance: 0.60,
    dimensionType: DimensionType.TIME
  }
];

// Mock drill-down data for different dimensions
const mockDrillDownData: Record<string, any[]> = {
  'customer.age_group': [
    { name: '18-25', value: 1250, percentage: 15.2 },
    { name: '26-35', value: 2180, percentage: 26.5 },
    { name: '36-45', value: 2850, percentage: 34.7 },
    { name: '46-55', value: 1420, percentage: 17.3 },
    { name: '56+', value: 520, percentage: 6.3 }
  ],
  'product.type': [
    { name: 'Auto Insurance', value: 3420, percentage: 42.0 },
    { name: 'Health Insurance', value: 2280, percentage: 28.0 },
    { name: 'Life Insurance', value: 1220, percentage: 15.0 },
    { name: 'Property Insurance', value: 815, percentage: 10.0 },
    { name: 'Others', value: 405, percentage: 5.0 }
  ],
  'customer.region': [
    { name: 'North', value: 2850, percentage: 35.0 },
    { name: 'South', value: 2040, percentage: 25.0 },
    { name: 'East', value: 1630, percentage: 20.0 },
    { name: 'West', value: 1220, percentage: 15.0 },
    { name: 'Central', value: 410, percentage: 5.0 }
  ],
  'sales.channel': [
    { name: 'Online', value: 3260, percentage: 40.0 },
    { name: 'Agent', value: 2850, percentage: 35.0 },
    { name: 'Branch', value: 1220, percentage: 15.0 },
    { name: 'Phone', value: 815, percentage: 10.0 }
  ],
  'customer.segment': [
    { name: 'Premium', value: 2440, percentage: 30.0 },
    { name: 'Standard', value: 3660, percentage: 45.0 },
    { name: 'Basic', value: 2040, percentage: 25.0 }
  ],
  'time.period': [
    { name: 'Q1 2023', value: 1950, percentage: 24.0 },
    { name: 'Q2 2023', value: 2110, percentage: 26.0 },
    { name: 'Q3 2023', value: 2280, percentage: 28.0 },
    { name: 'Q4 2023', value: 1800, percentage: 22.0 }
  ]
};

export interface DrillDownFilter {
  dimension: string;
  value: string;
  operator?: 'equals' | 'contains' | 'greater_than' | 'less_than';
}

export interface DrillDownRequest {
  metricId: string;
  dimension: string;
  filters?: DrillDownFilter[];
  limit?: number;
}

export interface DrillDownResponse {
  dimension: string;
  data: Array<{
    name: string;
    value: number;
    percentage: number;
    [key: string]: any;
  }>;
  totalCount: number;
  hasMore: boolean;
}

export interface IDrillDownService {
  getAvailableDimensions(metricId: string): Promise<MetricDimension[]>;
  getDrillDownData(request: DrillDownRequest): Promise<DrillDownResponse>;
  getMultiDimensionData(metricId: string, dimensions: string[]): Promise<Record<string, DrillDownResponse>>;
}

export class DrillDownService implements IDrillDownService {
  async getAvailableDimensions(metricId: string): Promise<MetricDimension[]> {
    if (isMockMode) {
      return mockDimensions;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/metrics/${metricId}/dimensions`, {
        headers: getDefaultHeaders()
      });
      return await checkResponse(response);
    } catch (error) {
      console.error('Error fetching dimensions:', error);
      console.log('Falling back to mock data');
      return mockDimensions;
    }
  }

  async getDrillDownData(request: DrillDownRequest): Promise<DrillDownResponse> {
    if (isMockMode) {
      const data = mockDrillDownData[request.dimension] || [];
      return {
        dimension: request.dimension,
        data: data.slice(0, request.limit || 10),
        totalCount: data.length,
        hasMore: data.length > (request.limit || 10)
      };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/metrics/${request.metricId}/drill-down`, {
        method: 'POST',
        headers: getDefaultHeaders(),
        body: JSON.stringify(request)
      });
      return await checkResponse(response);
    } catch (error) {
      console.error('Error fetching drill-down data:', error);
      console.log('Falling back to mock data');
      const data = mockDrillDownData[request.dimension] || [];
      return {
        dimension: request.dimension,
        data: data.slice(0, request.limit || 10),
        totalCount: data.length,
        hasMore: data.length > (request.limit || 10)
      };
    }
  }

  async getMultiDimensionData(metricId: string, dimensions: string[]): Promise<Record<string, DrillDownResponse>> {
    if (isMockMode) {
      const result: Record<string, DrillDownResponse> = {};
      for (const dimension of dimensions) {
        const data = mockDrillDownData[dimension] || [];
        result[dimension] = {
          dimension,
          data,
          totalCount: data.length,
          hasMore: false
        };
      }
      return result;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/metrics/${metricId}/multi-dimension`, {
        method: 'POST',
        headers: getDefaultHeaders(),
        body: JSON.stringify({ dimensions })
      });
      return await checkResponse(response);
    } catch (error) {
      console.error('Error fetching multi-dimension data:', error);
      console.log('Falling back to mock data');
      const result: Record<string, DrillDownResponse> = {};
      for (const dimension of dimensions) {
        const data = mockDrillDownData[dimension] || [];
        result[dimension] = {
          dimension,
          data,
          totalCount: data.length,
          hasMore: false
        };
      }
      return result;
    }
  }
}

export const drillDownService = new DrillDownService();