import { MetricDetail, MetricType } from '@/model/Metric';
import { MetricFlowResponse, MetricQueryRequest } from '@/model/metricFlow';
import { API_BASE_URL, getDefaultHeaders } from '@/utils/apiConfig';
const isMockMode = import.meta.env.VITE_USE_MOCK_DATA === 'true';

// Mock metrics data
export const mockMetrics: MetricType[] = [
  // Financial metrics
  {
    id: 'customer_acquisition_cost',
    name: 'Customer Acquisition Cost',
    value: 2850,
    unit: '¥',
    change: -5.3,
    status: 'positive',
    description: 'Average cost to acquire a new customer',
    lastUpdated: '2023-11-12T14:30:00Z',
    category: 'Average',
    categoryId: 'customer',
  },
  {
    id: 'premium_revenue',
    name: 'Premium Revenue',
    value: 1250000,
    unit: '¥',
    change: 8.5,
    status: 'positive',
    description: 'Total insurance premium revenue for the current period',
    lastUpdated: '2023-11-12T14:30:00Z',
    category: 'Volume',
    categoryId: 'sales-premium',
  },
  {
    id: 'profit_margin',
    name: 'Profit Margin',
    value: 15.7,
    unit: '%',
    change: 1.2,
    status: 'positive',
    description: 'Net profit as a percentage of total revenue',
    lastUpdated: '2023-11-11T09:45:00Z',
    category: 'Ratio',
    categoryId: 'sales',
  },
  {
    id: 'combined_ratio',
    name: 'Combined Ratio',
    value: 92.3,
    unit: '%',
    change: -1.5,
    status: 'positive',
    description: 'Ratio of claims and expenses to premium revenue',
    lastUpdated: '2023-11-10T11:30:00Z',
    category: 'Ratio',
    categoryId: 'sales-premium',
  },
  
  // Operational metrics
  {
    id: 'policy_renewal_rate',
    name: 'Policy Renewal Rate',
    value: 83.7,
    unit: '%',
    change: 2.1,
    status: 'positive',
    description: 'Percentage of policies renewed upon expiration',
    lastUpdated: '2023-11-09T15:20:00Z',
    category: 'Ratio',
    categoryId: 'sales-policies',
  },
  {
    id: 'claim_processing_time',
    name: 'Claim Processing Time',
    value: 7.2,
    unit: 'days',
    change: -15.3,
    status: 'positive',
    description: 'Average time from claim submission to settlement',
    lastUpdated: '2023-11-08T12:15:00Z',
    category: 'Average',
    categoryId: 'sales-policies',
  },
  {
    id: 'conversion_rate',
    name: 'Conversion Rate',
    value: 3.8,
    unit: '%',
    change: 0.2,
    status: 'positive',
    description: 'Percentage of potential customers converted to actual customers',
    lastUpdated: '2023-11-07T10:10:00Z',
    category: 'Ratio',
    categoryId: 'channel',
  },
  {
    id: 'policy_issuance_time',
    name: 'Policy Issuance Time',
    value: 2.5,
    unit: 'days',
    change: -0.3,
    status: 'positive',
    description: 'Average time from application to policy issuance',
    lastUpdated: '2023-11-06T16:40:00Z',
    category: 'Average',
    categoryId: 'sales-policies',
  },
  
  // Customer metrics
  {
    id: 'customer_satisfaction',
    name: 'Customer Satisfaction',
    value: 4.2,
    unit: '/5',
    change: 0.3,
    status: 'positive',
    description: 'Average rating of customer service experience',
    lastUpdated: '2023-11-05T13:25:00Z',
    category: 'Average',
    categoryId: 'customer',
  },
  {
    id: 'customer_retention_rate',
    name: 'Customer Retention Rate',
    value: 78.5,
    unit: '%',
    change: 1.7,
    status: 'positive',
    description: 'Percentage of customers maintaining business relationship with the company',
    lastUpdated: '2023-11-04T09:15:00Z',
    category: 'Ratio',
    categoryId: 'customer',
  },
  {
    id: 'cross_sell_rate',
    name: 'Cross-Sell Rate',
    value: 24.8,
    unit: '%',
    change: -1.2,
    status: 'negative',
    description: 'Percentage of customers purchasing multiple products',
    lastUpdated: '2023-11-03T14:50:00Z',
    category: 'Ratio',
    categoryId: 'sales',
  },
  {
    id: 'net_promoter_score',
    name: 'Net Promoter Score',
    value: 42,
    unit: '',
    change: 5,
    status: 'positive',
    description: 'Metric measuring customer willingness to recommend',
    lastUpdated: '2023-11-02T11:30:00Z',
    category: 'Average',
    categoryId: 'customer',
  },
  
  // Risk metrics
  {
    id: 'claim_ratio',
    name: 'Claim Ratio',
    value: 62.3,
    unit: '%',
    change: 0.8,
    status: 'negative',
    description: 'Ratio of claim expenses to premium revenue',
    lastUpdated: '2023-11-01T16:20:00Z',
    category: 'Ratio',
    categoryId: 'sales-premium',
  },
  {
    id: 'risk_score',
    name: 'Risk Score',
    value: 68.5,
    unit: '/100',
    change: -2.3,
    status: 'positive',
    description: 'Overall risk assessment score of the insurance portfolio',
    lastUpdated: '2023-10-31T10:45:00Z',
    category: 'Average',
    categoryId: 'sales',
  },
  {
    id: 'fraud_detection_rate',
    name: 'Fraud Detection Rate',
    value: 3.2,
    unit: '%',
    change: 0.5,
    status: 'positive',
    description: 'Percentage of claims identified as fraudulent',
    lastUpdated: '2023-10-30T14:10:00Z',
    category: 'Ratio',
    categoryId: 'sales',
  },
  {
    id: 'reserve_adequacy',
    name: 'Reserve Adequacy',
    value: 105.8,
    unit: '%',
    change: 1.2,
    status: 'positive',
    description: 'Ratio of actual reserves to expected claims',
    lastUpdated: '2023-10-29T09:30:00Z',
    category: 'Ratio',
    categoryId: 'sales',
  }
];

// Metric relationship data - for network graph view
export const metricRelationships = [
  { source: 'customer_acquisition_cost', target: 'conversion_rate', type: 'negative', strength: 0.8, description: 'Lower customer acquisition cost helps improve conversion rate' },
  { source: 'customer_satisfaction', target: 'policy_renewal_rate', type: 'positive', strength: 0.9, description: 'Higher customer satisfaction increases policy renewal rate' },
  { source: 'claim_processing_time', target: 'customer_satisfaction', type: 'negative', strength: 0.7, description: 'Shorter claim processing time improves customer satisfaction' },
  { source: 'cross_sell_rate', target: 'premium_revenue', type: 'positive', strength: 0.6, description: 'Higher cross-sell rate increases premium revenue' },
  { source: 'risk_score', target: 'claim_ratio', type: 'positive', strength: 0.8, description: 'Higher risk score typically leads to increased claim ratio' },
  { source: 'customer_retention_rate', target: 'profit_margin', type: 'positive', strength: 0.7, description: 'Higher customer retention rate increases profit margin' },
  { source: 'fraud_detection_rate', target: 'claim_ratio', type: 'negative', strength: 0.5, description: 'Higher fraud detection rate reduces claim ratio' },
  { source: 'policy_issuance_time', target: 'conversion_rate', type: 'negative', strength: 0.6, description: 'Shorter policy issuance time improves conversion rate' },
  { source: 'customer_satisfaction', target: 'net_promoter_score', type: 'positive', strength: 0.9, description: 'Higher customer satisfaction increases net promoter score' },
  { source: 'combined_ratio', target: 'profit_margin', type: 'negative', strength: 0.8, description: 'Lower combined ratio improves profit margin' },
  { source: 'risk_score', target: 'premium_revenue', type: 'negative', strength: 0.4, description: 'Higher risk score may reduce premium revenue' },
  { source: 'customer_retention_rate', target: 'customer_acquisition_cost', type: 'negative', strength: 0.5, description: 'Higher customer retention rate reduces customer acquisition cost' }
];

// Metric category data - for dashboard view
export const metricCategories = [
  {
    id: 'financial',
    name: 'Financial Metrics',
    description: 'Revenue, cost, profit and other finance-related metrics',
    color: 'bg-green-100 text-green-800',
    metrics: ['customer_acquisition_cost', 'premium_revenue', 'profit_margin', 'combined_ratio']
  },
  {
    id: 'operational',
    name: 'Operational Metrics',
    description: 'Business process efficiency and operational performance metrics',
    color: 'bg-blue-100 text-blue-800',
    metrics: ['policy_renewal_rate', 'claim_processing_time', 'conversion_rate', 'policy_issuance_time']
  },
  {
    id: 'customer',
    name: 'Customer Metrics',
    description: 'Customer satisfaction, retention rate and other customer-related metrics',
    color: 'bg-purple-100 text-purple-800',
    metrics: ['customer_satisfaction', 'customer_retention_rate', 'cross_sell_rate', 'net_promoter_score']
  },
  {
    id: 'risk',
    name: 'Risk Metrics',
    description: 'Risk assessment and management related metrics',
    color: 'bg-red-100 text-red-800',
    metrics: ['claim_ratio', 'risk_score', 'fraud_detection_rate', 'reserve_adequacy']
  }
];

// Trend data for metrics over time
export const trendData = [
  { name: 'Jan', policy_renewal_rate: 78.2, cross_sell_rate: 18.3, customer_satisfaction: 3.7, claim_ratio: 62.5, profit_margin: 15.2 },
  { name: 'Feb', policy_renewal_rate: 77.8, cross_sell_rate: 19.1, customer_satisfaction: 3.8, claim_ratio: 63.1, profit_margin: 14.8 },
  { name: 'Mar', policy_renewal_rate: 79.5, cross_sell_rate: 20.5, customer_satisfaction: 3.9, claim_ratio: 61.8, profit_margin: 16.0 },
  { name: 'Apr', policy_renewal_rate: 80.2, cross_sell_rate: 21.2, customer_satisfaction: 4.0, claim_ratio: 60.5, profit_margin: 16.5 },
  { name: 'May', policy_renewal_rate: 81.0, cross_sell_rate: 22.0, customer_satisfaction: 4.1, claim_ratio: 59.8, profit_margin: 17.2 },
  { name: 'Jun', policy_renewal_rate: 82.5, cross_sell_rate: 22.8, customer_satisfaction: 4.2, claim_ratio: 58.5, profit_margin: 18.0 },
  { name: 'Jul', policy_renewal_rate: 83.1, cross_sell_rate: 23.5, customer_satisfaction: 4.3, claim_ratio: 57.9, profit_margin: 18.5 },
  { name: 'Aug', policy_renewal_rate: 82.8, cross_sell_rate: 24.0, customer_satisfaction: 4.2, claim_ratio: 58.2, profit_margin: 18.3 },
  { name: 'Sep', policy_renewal_rate: 83.5, cross_sell_rate: 24.8, customer_satisfaction: 4.4, claim_ratio: 57.0, profit_margin: 19.0 },
  { name: 'Oct', policy_renewal_rate: 84.2, cross_sell_rate: 25.5, customer_satisfaction: 4.5, claim_ratio: 56.5, profit_margin: 19.5 },
  { name: 'Nov', policy_renewal_rate: 85.0, cross_sell_rate: 26.2, customer_satisfaction: 4.6, claim_ratio: 55.8, profit_margin: 20.2 },
  { name: 'Dec', policy_renewal_rate: 86.5, cross_sell_rate: 27.0, customer_satisfaction: 4.7, claim_ratio: 54.5, profit_margin: 21.0 }
];

// Distribution data for insurance types
export const distributionData = [
  { name: 'Auto Insurance', value: 42 },
  { name: 'Health Insurance', value: 28 },
  { name: 'Life Insurance', value: 15 },
  { name: 'Property Insurance', value: 10 },
  { name: 'Others', value: 5 },
];




export interface TrendDataPoint {
  name: string;
  policy_renewal_rate: number;
  cross_sell_rate: number;
  customer_satisfaction: number;
  claim_ratio: number;
  profit_margin: number;
}

export interface DistributionDataPoint {
  name: string;
  value: number;
}

export interface IMetricsApi {
  getMetrics(): Promise<MetricType[]>;
  getMetricById(id: string): Promise<MetricDetail | null>;
  getTrendData(): Promise<TrendDataPoint[]>;
  getDistributionData(): Promise<DistributionDataPoint[]>;
  suggestMetrics(title: string, description: string): Promise<string[]>;
  getMetricValue(req: MetricQueryRequest): Promise<MetricFlowResponse>;
}

export class MetricsService implements IMetricsApi {
  private useMockData: boolean;

  constructor(useMockData: boolean = false) {
    this.useMockData = useMockData;
  }

  async getMetricById(id: string): Promise<MetricDetail | null> {
    try {
      // if (this.useMockData) {
      //   const metric = mockMetrics.find(m => m.id === id);
      //   return metric || null;
      // }

      const response = await fetch(`${API_BASE_URL}/metric/${id}`, {
        headers: getDefaultHeaders()
      });
      
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch metric');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching metric:', error);
      // if (this.useMockData) {
      //   const metric = mockMetrics.find(m => m.id === id);
      //   return metric || null;
      // }
      throw error;
    }
  }

  async suggestMetrics(title: string, description: string): Promise<string[]> {
    if (this.useMockData) {
      return [
        'Customer Acquisition Rate',
        'Conversion Rate',
        'Customer Retention Rate',
        'Customer Satisfaction'
      ];
    }

    try {
      const response = await fetch(`${API_BASE_URL}/metrics/suggest`, {
        method: 'POST',
        headers: getDefaultHeaders(),
        body: JSON.stringify({ title, description })
      });
      
      if (!response.ok) throw new Error('Failed to fetch suggested metrics');
      
      const metrics = await response.json();
     

      // get metric name  and convert to str list 
      const metricNames = metrics.map((metric: MetricType) => metric.name);
      

      return metricNames || [
        'Customer Acquisition Rate',
        'Conversion Rate',
        'Customer Retention Rate',
        'Customer Satisfaction'
      ];
    } catch (error) {
      console.error('Error fetching suggested metrics:', error);
      return [
        'Customer Acquisition Rate',
        'Conversion Rate',
        'Customer Retention Rate',
        'Customer Satisfaction'
      ];
    }
  }

  async getMetrics(): Promise<MetricType[]> {
    // if (this.useMockData) {
    //   return mockMetrics;
    // }

    try {
      const response = await fetch(`${API_BASE_URL}/metrics/all`,{
        headers: getDefaultHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch metrics');
      return await response.json();
    } catch (error) {
      console.error('Error fetching metrics:', error);
      if (this.useMockData) {
        return mockMetrics;
      }
      throw error;
    }
  }

  async getTrendData(): Promise<TrendDataPoint[]> {
    if (this.useMockData) {
      return trendData;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/metrics/trend`);
      if (!response.ok) throw new Error('Failed to fetch trend data');
      return await response.json();
    } catch (error) {
      console.error('Error fetching trend data:', error);
      if (this.useMockData) {
        return trendData;
      }
      throw error;
    }
  }

  async getDistributionData(): Promise<DistributionDataPoint[]> {
    if (this.useMockData) {
      return distributionData;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/metrics/distribution`);
      if (!response.ok) throw new Error('Failed to fetch distribution data');
      return await response.json();
    } catch (error) {
      console.error('Error fetching distribution data:', error);
      if (this.useMockData) {
        return distributionData;
      }
      throw error;
    }
  }

  async getMetricValue(req: MetricQueryRequest): Promise<MetricFlowResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/watchmen/metric/get_metric_value`, {
        method: 'POST',
        headers: getDefaultHeaders(),
        body: JSON.stringify(req)
      });
      if (!response.ok) throw new Error('Failed to fetch metric value');
      return await response.json();
    } catch (error) {
      console.error('Error fetching metric value:', error);
      if (this.useMockData) {
        return {
          column_names: (req.group_by && req.group_by.length > 0) ? [...req.group_by, 'value'] : ['value'],
          data: []
        };
      }
      throw error;
    }
  }
}

export const metricsService = new MetricsService(isMockMode); // Use environment variable for mock mode
