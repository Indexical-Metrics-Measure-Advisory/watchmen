import {
  MetricDefinition,
  MetricCategory,
  MetricsSummary,
  MetricValue,
  MetricFilter,
  Category,
  CategoryFilter,
  CategoryStats,
  CategoryOperationResult, BulkCategoryOperation
} from '@/model/metricsManagement';
import { Message } from '@/components/ai/AIMessage';
import { API_BASE_URL, getDefaultHeaders, checkResponse } from '@/utils/apiConfig';
import type { MetricDimension } from '@/model/analysis';
import { DimensionType } from '@/model/analysis';

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ===== Category Management API =====

// Get category hierarchy structure (Deprecated: use getCategories)
export const getCategoriesHierarchy = async (filter?: CategoryFilter): Promise<Category[]> => {
  return getCategories(filter);
};

// Get flattened category list
export const getCategories = async (filter?: CategoryFilter): Promise<Category[]> => {
  await delay(200);
  
  try {
    const response = await fetch(`${API_BASE_URL}/metricflow/category/all`, {
      method: 'GET',
      headers: getDefaultHeaders()
    });

    // if (response.status === 404) {
    //   return getMockCategories(filter);
    // }

    const categories = await checkResponse(response);
    
    // Apply filters
    if (filter) {
      return applyFilterToCategories(categories, filter);
    }
    
    return categories;
  } catch (error) {
    console.warn('Failed to fetch categories, using mock data:', error);
    // return getMockCategories(filter);
  }
};

// Get single category details
export const getCategory = async (categoryId: string): Promise<Category | null> => {
  await delay(150);

  
  try {
    const response = await fetch(`${API_BASE_URL}/metricflow/category/${encodeURIComponent(categoryId)}`, {
      method: 'GET',
      headers: getDefaultHeaders()
    });

    if (response.status === 404) {
      return null;
    }

    await checkResponse(response);
    const category = await response.json();
    return category;
  } catch (error) {
    console.error('Failed to get category:', error);
    throw new MetricsAPIException(
      MetricsAPIError.SERVER_ERROR,
      'Failed to get category',
      error instanceof Error ? undefined : (error as any)?.status,
      error instanceof Error ? error : undefined
    );
  }
};

// Create category
export const createCategory = async (categoryData: Partial<Category>): Promise<CategoryOperationResult> => {
  await delay(400);
  
  try {
    // Validate category data
    const validationErrors = validateCategoryData(categoryData);
    if (validationErrors.length > 0) {
      return {
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      };
    }

    const response = await fetch(`${API_BASE_URL}/metricflow/category`, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify(categoryData)
    });

    // if (response.status === 404) {
    //   // Simulate successful creation
    //   const newCategory = createMockCategory(categoryData);
    //   return {
    //     success: true,
    //     message: 'Category created successfully',
    //     data: newCategory
    //   };
    // }

    const result = await checkResponse(response);
    return {
      success: true,
      message: 'Category created successfully',
      data: result
    };
  } catch (error) {
    console.error('Failed to create category:', error);
    return {
      success: false,
      message: 'Failed to create category',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
};

// Update category
export const updateCategory = async (categoryId: string, updates: Partial<Category>): Promise<CategoryOperationResult> => {
  await delay(350);
  
  try {
    const response = await fetch(`${API_BASE_URL}/metricflow/category/${categoryId}`, {
      method: 'PUT',
      headers: getDefaultHeaders(),
      body: JSON.stringify(updates)
    });

    if (response.status === 404) {
      return {
        success: false,
        message: 'Category not found',
        errors: ['Category does not exist']
      };
    }

    const result = await checkResponse(response);
    return {
      success: true,
      message: 'Category updated successfully',
      data: result
    };
  } catch (error) {
    console.error('Failed to update category:', error);
    return {
      success: false,
      message: 'Failed to update category',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
};

// Delete category
export const deleteCategory = async (categoryId: string, forceDelete: boolean = false): Promise<CategoryOperationResult> => {
  await delay(300);
  
  try {
    // const queryParams = forceDelete ? '?force=true' : '';
    const response = await fetch(`${API_BASE_URL}/metricflow/category/delete/${categoryId}`, {
      method: 'GET',
      headers: getDefaultHeaders()
    });

    if (response.status === 404) {
      return {
        success: false,
        message: 'Category not found',
        errors: ['Category does not exist']
      };
    }

    if (response.status === 409) {
      return {
        success: false,
        message: 'Cannot delete category with associated metrics',
        errors: ['Category has associated metrics. Use force delete or reassign metrics first.']
      };
    }

    await checkResponse(response);
    return {
      success: true,
      message: 'Category deleted successfully'
    };
  } catch (error) {
    console.error('Failed to delete category:', error);
    return {
      success: false,
      message: 'Failed to delete category',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
};

// Get category statistics
export const getCategoryStats = async (): Promise<CategoryStats[]> => {
  await delay(250);
  
  try {
    const response = await fetch(`${API_BASE_URL}/metricflow/metric/categories/stats`, {
      method: 'GET',
      headers: getDefaultHeaders()
    });

    // if (response.status === 404) {
    //   return getMockCategoryStats();
    // }

    await checkResponse(response);
    const stats = await response.json();
    return stats;
  } catch (error) {
    console.warn('Failed to fetch category stats, using mock data:', error);
    // return getMockCategoryStats();
  }
};

// ===== Metric Category Association API =====

// Assign metrics to category
export const assignMetricsToCategory = async (metricIds: string[], categoryId: string): Promise<CategoryOperationResult> => {
  await delay(400);
  
  try {
    const response = await fetch(`${API_BASE_URL}/metricflow/categories/${encodeURIComponent(categoryId)}/metrics`, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify({ metricIds })
    });

    if (response.status === 404) {
      return {
        success: true,
        message: `Successfully assigned ${metricIds.length} metrics to category`
      };
    }

    await checkResponse(response);
    return {
      success: true,
      message: `Successfully assigned ${metricIds.length} metrics to category`
    };
  } catch (error) {
    console.error('Failed to assign metrics to category:', error);
    return {
      success: false,
      message: 'Failed to assign metrics to category',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
};

// Remove metrics from category
export const removeMetricsFromCategory = async (metricIds: string[], categoryId: string): Promise<CategoryOperationResult> => {
  await delay(350);
  
  try {
    const response = await fetch(`${API_BASE_URL}/metricflow/categories/${encodeURIComponent(categoryId)}/metrics`, {
      method: 'DELETE',
      headers: getDefaultHeaders(),
      body: JSON.stringify({ metricIds })
    });

    if (response.status === 404) {
      return {
        success: true,
        message: `Successfully removed ${metricIds.length} metrics from category`
      };
    }

    await checkResponse(response);
    return {
      success: true,
      message: `Successfully removed ${metricIds.length} metrics from category`
    };
  } catch (error) {
    console.error('Failed to remove metrics from category:', error);
    return {
      success: false,
      message: 'Failed to remove metrics from category',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
};

// Bulk category operations
export const performBulkCategoryOperation = async (operation: BulkCategoryOperation): Promise<CategoryOperationResult> => {
  await delay(500);
  
  try {
    const response = await fetch(`${API_BASE_URL}/metricflow/categories/bulk-operation`, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify(operation)
    });

    if (response.status === 404) {
      return {
        success: true,
        message: `Successfully performed ${operation.operation} operation on ${operation.metricIds.length} metrics`
      };
    }

    await checkResponse(response);
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to perform bulk category operation:', error);
    return {
      success: false,
      message: 'Failed to perform bulk operation',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
};

// ===== Extension of Existing Metrics API =====

// Get all metrics with optional real-time data (extended support for category filtering)
export const getMetrics = async (filter?: MetricFilter): Promise<MetricDefinition[]> => {
  await delay(500);
  // Prefer mock data when explicitly enabled via env flag
  const isMockMode = import.meta.env.VITE_USE_MOCK_DATA === 'true';
  if (isMockMode) {
    const mock = getMockMetricDefinitions();
    return filter ? applyMetricFilters(mock, filter) : mock;
  }

  console.log('Fetching metrics with filter:', filter);
  
  try {
    // Try to fetch real-time data first
    const isAPIAvailable = await isRealTimeMetricsAvailable();
    
    if (isAPIAvailable) {
      try {
        const realTimeData = await fetchRealTimeMetrics();
        const metrics: MetricDefinition[] = (realTimeData?.metrics ?? realTimeData ?? []) as MetricDefinition[];
        const filtered = filter ? applyMetricFilters(metrics, filter) : metrics;
        // If real-time returns empty list, fall back to mock to keep UI useful

        // console.log('Real-time metrics:', filtered);
       
        return filtered;
        // const mock = getMockMetricDefinitions();
        // return filter ? applyMetricFilters(mock, filter) : mock;
      } catch (error) {
        console.warn('Failed to fetch real-time metrics, falling back to mock data:', error);
        // Fall through to mock data
      }
    }
  } catch (error) {
    console.warn('API availability check failed, using mock data:', error);
    // Fall through to mock data
  }
  
  // Fallback: provide mock metric definitions so UI can still function
  const mock = getMockMetricDefinitions();
  const filtered = filter ? applyMetricFilters(mock, filter) : mock;
  return filtered;
};

// Apply metric filtering logic (extended version)
const applyMetricFilters = (metrics: MetricDefinition[], filter: MetricFilter): MetricDefinition[] => {
  let filteredMetrics = [...metrics];

  // New category filtering logic
  if (filter.categoryId && filter.categoryId !== 'all') {
    filteredMetrics = filteredMetrics.filter(m => m.categoryId === filter.categoryId);
  }
  
  if (filter.type && filter.type !== 'all') {
    filteredMetrics = filteredMetrics.filter(m => m.type === filter.type);
  }

  if (filter.searchTerm) {
    const searchLower = filter.searchTerm.toLowerCase();
    filteredMetrics = filteredMetrics.filter(m => 
      m.name.toLowerCase().includes(searchLower) ||
      (m.label ? m.label.toLowerCase().includes(searchLower) : false) ||
      (m.description ? m.description.toLowerCase().includes(searchLower) : false)
    );
  }

  // New category filtering logic
  if (filter.categoryId) {
    filteredMetrics = filteredMetrics.filter(m => {
      const cid = m.categoryId || '';
      return cid === filter.categoryId;
    });
  }

  if (filter.tags && filter.tags.length > 0) {
    filteredMetrics = filteredMetrics.filter(m => 
      m.tags && filter.tags!.some(tag => m.tags!.includes(tag))
    );
  }

  if (filter.isActive !== undefined) {
    filteredMetrics = filteredMetrics.filter(m => m.isActive === filter.isActive);
  }

  return filteredMetrics;
};

// ===== Mock Data and Helper Functions =====

// Mock category data (Flat structure)
const getMockCategories = (filter?: CategoryFilter): Category[] => {
  const mockCategories: Category[] = [
    {
      id: 'sales',
      name: 'Sales Performance',
      description: 'Sales and revenue related metrics',
      color: '#3B82F6',
      icon: 'TrendingUp',
      isActive: true,
      sortOrder: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'sales-premium',
      name: 'Premium Income',
      description: 'Premium income metrics',
      color: '#10B981',
      icon: 'DollarSign',
      isActive: true,
      sortOrder: 2,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'sales-policies',
      name: 'Policy Metrics',
      description: 'Policy count and related metrics',
      color: '#8B5CF6',
      icon: 'FileText',
      isActive: true,
      sortOrder: 3,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'customer',
      name: 'Customer Analytics',
      description: 'Customer behavior and demographics',
      color: '#F59E0B',
      icon: 'Users',
      isActive: true,
      sortOrder: 4,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'customer-demographics',
      name: 'Demographics',
      description: 'Customer demographic metrics',
      color: '#EF4444',
      icon: 'BarChart3',
      isActive: true,
      sortOrder: 5,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'channel',
      name: 'Channel Performance',
      description: 'Distribution channel metrics',
      color: '#06B6D4',
      icon: 'GitBranch',
      isActive: true,
      sortOrder: 6,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  ];

  if (filter) {
    return applyFilterToCategories(mockCategories, filter);
  }

  return mockCategories;
};

// Deprecated: Alias to getMockCategories for backward compatibility
function getMockCategoriesHierarchy(filter?: CategoryFilter): Category[] {
  return getMockCategories(filter);
}

// Apply category filtering
function applyFilterToCategories(categories: Category[], filter: CategoryFilter): Category[] {
  let filtered = [...categories];

  if (filter.isActive !== undefined) {
    filtered = filtered.filter(c => c.isActive === filter.isActive);
  }

  if (filter.searchTerm) {
    const searchLower = filter.searchTerm.toLowerCase();
    filtered = filtered.filter(c => 
      c.name.toLowerCase().includes(searchLower) ||
      (c.description && c.description.toLowerCase().includes(searchLower))
    );
  }

  return filtered;
}

// Mock category statistics
function getMockCategoryStats(): CategoryStats[] {
  return [
    { id: 'sales', name: 'Sales Performance', metricsCount: 8 },
    { id: 'sales-premium', name: 'Premium Income', metricsCount: 4 },
    { id: 'sales-policies', name: 'Policy Metrics', metricsCount: 4 },
    { id: 'customer', name: 'Customer Analytics', metricsCount: 6 },
    { id: 'customer-demographics', name: 'Demographics', metricsCount: 3 },
    { id: 'channel', name: 'Channel Performance', metricsCount: 5 }
  ];
}

// Mock metrics definitions to ensure selector works when API is unavailable
function getMockMetricDefinitions(): MetricDefinition[] {
  const now = new Date().toISOString();
  const common = {
    isActive: true,
    createdAt: now,
    updatedAt: now,
    tags: [] as string[]
  };
  return [
    {
      id: 'premium_revenue',
      name: 'premium_revenue',
      label: 'Premium Revenue',
      description: 'Total insurance premium revenue for the current period',
      type: 'simple',
      type_params: { measure: { name: 'premium_revenue', join_to_timespine: true } as any },
      categoryId: 'sales-premium',
      unit: '¥',
      format: 'currency',
      ...common,
      tags: ['financial', 'revenue']
    },
    {
      id: 'policy_renewal_rate',
      name: 'policy_renewal_rate',
      label: 'Policy Renewal Rate',
      description: 'Percentage of policies renewed upon expiration',
      type: 'ratio',
      type_params: { numerator: { name: 'renewed_policies', join_to_timespine: true } as any, denominator: { name: 'policies_total', join_to_timespine: true } as any },
      categoryId: 'sales-policies',
      unit: '%',
      format: 'percentage',
      ...common,
      tags: ['operational', 'ratio']
    },
    {
      id: 'conversion_rate',
      name: 'conversion_rate',
      label: 'Conversion Rate',
      description: 'Percentage of potential customers converted to actual customers',
      type: 'ratio',
      type_params: { numerator: { name: 'converted_customers', join_to_timespine: true } as any, denominator: { name: 'leads_total', join_to_timespine: true } as any },
      categoryId: 'channel',
      unit: '%',
      format: 'percentage',
      ...common,
      tags: ['marketing', 'conversion']
    },
    {
      id: 'customer_satisfaction',
      name: 'customer_satisfaction',
      label: 'Customer Satisfaction',
      description: 'Average rating of customer service experience',
      type: 'simple',
      type_params: { measure: { name: 'customer_satisfaction', join_to_timespine: true } as any },
      categoryId: 'customer-demographics',
      unit: '/5',
      format: 'number',
      ...common,
      tags: ['customer', 'experience']
    },
    {
      id: 'claim_ratio',
      name: 'claim_ratio',
      label: 'Claim Ratio',
      description: 'Ratio of claim expenses to premium revenue',
      type: 'ratio',
      type_params: { numerator: { name: 'claims_amount', join_to_timespine: true } as any, denominator: { name: 'premium_revenue', join_to_timespine: true } as any },
      categoryId: 'sales-premium',
      unit: '%',
      format: 'percentage',
      ...common,
      tags: ['risk', 'claims']
    },
    {
      id: 'customer_retention_rate',
      name: 'customer_retention_rate',
      label: 'Customer Retention Rate',
      description: 'Percentage of customers maintaining relationship with the company',
      type: 'ratio',
      type_params: { numerator: { name: 'retained_customers', join_to_timespine: true } as any, denominator: { name: 'customers_total', join_to_timespine: true } as any },
      categoryId: 'sales-policies',
      unit: '%',
      format: 'percentage',
      ...common,
      tags: ['customer', 'retention']
    },
    {
      id: 'combined_ratio',
      name: 'combined_ratio',
      label: 'Combined Ratio',
      description: 'Ratio of claims and expenses to premium revenue',
      type: 'derived',
      type_params: { expr: '(claims + expenses) / premium_revenue' },
      categoryId: 'sales-premium',
      unit: '%',
      format: 'percentage',
      ...common,
      tags: ['financial', 'efficiency']
    },
    {
      id: 'risk_score',
      name: 'risk_score',
      label: 'Risk Score',
      description: 'Overall risk assessment score of the insurance portfolio',
      type: 'simple',
      type_params: { measure: { name: 'risk_score', join_to_timespine: true } as any },
      categoryId: 'channel',
      unit: '/100',
      format: 'number',
      ...common,
      tags: ['risk']
    }
  ];
};

// Create mock category
const createMockCategory = (data: Partial<Category>): Category => {
  const now = new Date().toISOString();
  return {
    id: `category_${Date.now()}`,
    name: data.name || '',
    description: data.description,
    color: data.color || '#6B7280',
    icon: data.icon || 'Folder',
    isActive: true,
    sortOrder: data.sortOrder || 999,
    createdAt: now,
    updatedAt: now
  };
};

// Validate category data
const validateCategoryData = (data: Partial<Category>): string[] => {
  const errors: string[] = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push('Category name is required');
  }

  if (data.name && data.name.length > 100) {
    errors.push('Category name must be less than 100 characters');
  }

  if (data.description && data.description.length > 500) {
    errors.push('Category description must be less than 500 characters');
  }

  return errors;
};

// ===== Existing API Methods Remain Unchanged =====

// Get metric categories with optional real-time data
export const getMetricCategories = async (): Promise<MetricCategory[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/metricflow/metric/metrics/categories`, {
      method: 'GET',
      headers: getDefaultHeaders()
    });

    await checkResponse(response);
    const categories = await response.json();
    return categories;
  } catch (error) {
    console.error('Failed to get metric categories:', error);
    throw new MetricsAPIException(
      MetricsAPIError.SERVER_ERROR,
      'Failed to get metric categories',
      error instanceof Error ? undefined : (error as any)?.status,
      error instanceof Error ? error : undefined
    );
  }
};

// Get metrics summary
export const getMetricsSummary = async (): Promise<MetricsSummary> => {
  try {
    const response = await fetch(`${API_BASE_URL}/metricflow/metric/summary`, {
      method: 'GET',
      headers: getDefaultHeaders()
    });

    await checkResponse(response);
    const summary = await response.json();
    return summary;
  } catch (error) {
    console.error('Failed to get metrics summary:', error);
    throw new MetricsAPIException(
      MetricsAPIError.SERVER_ERROR,
      'Failed to get metrics summary',
      error instanceof Error ? undefined : (error as any)?.status,
      error instanceof Error ? error : undefined
    );
  }
};

// Get single metric
export const getMetric = async (name: string): Promise<MetricDefinition | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/metricflow/metric/${encodeURIComponent(name)}`, {
      method: 'GET',
      headers: getDefaultHeaders()
    });

    if (response.status === 404) {
      return null;
    }

    await checkResponse(response);
    const metric = await response.json();
    return metric;
  } catch (error) {
    console.error('Failed to get metric:', error);
    throw new MetricsAPIException(
      MetricsAPIError.SERVER_ERROR,
      'Failed to get metric',
      error instanceof Error ? undefined : (error as any)?.status,
      error instanceof Error ? error : undefined
    );
  }
};

// Create metric
export const createMetric = async (metric: Omit<MetricDefinition, 'createdAt' | 'updatedAt'>): Promise<MetricDefinition> => {
  try {
    metric.id = "fake";
    const response = await fetch(`${API_BASE_URL}/metricflow/metric`, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify(metric)
    });

   
    const newMetric =  await checkResponse(response);
    return newMetric;
  } catch (error) {
    console.error('Failed to create metric:', error);
    throw new MetricsAPIException(
      MetricsAPIError.SERVER_ERROR,
      'Failed to create metric',
      error instanceof Error ? undefined : (error as any)?.status,
      error instanceof Error ? error : undefined
    );
  }
};

// Update metric
export const updateMetric = async (name: string, updates: Partial<MetricDefinition>): Promise<MetricDefinition> => {
  try {
    // updates.id="fake"
    const response = await fetch(`${API_BASE_URL}/metricflow/metric/${name}`, {
      method: 'PUT',
      headers: getDefaultHeaders(),
      body: JSON.stringify(updates)
    });
   

    const updatedMetric = await checkResponse(response);
    return updatedMetric;
  } catch (error) {
    console.error('Failed to update metric:', error);
    throw new MetricsAPIException(
      MetricsAPIError.SERVER_ERROR,
      'Failed to update metric',
      error instanceof Error ? undefined : (error as any)?.status,
      error instanceof Error ? error : undefined
    );
  }
};

// Delete metric
export const deleteMetric = async (name: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/metricflow/metric/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers: getDefaultHeaders()
    });

    await checkResponse(response);
  } catch (error) {
    console.error('Failed to delete metric:', error);
    throw new MetricsAPIException(
      MetricsAPIError.SERVER_ERROR,
      'Failed to delete metric',
      error instanceof Error ? undefined : (error as any)?.status,
      error instanceof Error ? error : undefined
    );
  }
};

// Get metric values
export const getMetricValues = async (metricNames: string[]): Promise<MetricValue[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/watchmen/metric/metrics/values`, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify({ metricNames })
    });

    await checkResponse(response);
    const metricValues = await response.json();
    return metricValues;
  } catch (error) {
    console.error('Failed to get metric values:', error);
    throw new MetricsAPIException(
      MetricsAPIError.SERVER_ERROR,
      'Failed to get metric values',
      error instanceof Error ? undefined : (error as any)?.status,
      error instanceof Error ? error : undefined
    );
  }
};

// ===== AI-Powered Metrics Analysis =====

interface AIMetricsQuery {
  query: string;
  context?: string;
  metrics?: string[];
  categories?: string[];
}

interface AIMetricsInsight {
  title: string;
  description: string;
  metrics: string[];
  recommendation?: string;
  priority: 'high' | 'medium' | 'low';
}

const generateAIMetricsResponse = async (query: string, context?: string): Promise<string> => {
  // Simulate AI processing delay
  await delay(1500);
  
  const lowerQuery = query.toLowerCase();
  
  // Pattern matching for different types of queries
  if (lowerQuery.includes('sales') || lowerQuery.includes('revenue') || lowerQuery.includes('premium')) {
    return `## Sales Performance Analysis

Based on your query about "${query}", here's what I found:

### Key Insights:
- **Total Annual Premium**: HKD 2.5B (↑12% YoY)
- **Policy Count**: 45,000 policies issued this year
- **Average Premium per Policy**: HKD 55,556

### Trends:
1. **Strong Growth**: Premium income shows consistent 12% year-over-year growth
2. **Policy Volume**: New business policies increased by 8% compared to last year
3. **Premium Efficiency**: Average premium per policy increased by 3.7%

### Recommendations:
- Focus on high-value customer segments
- Optimize pricing strategies for better premium-to-coverage ratios
- Consider expanding successful product lines`;
  }
  
  if (lowerQuery.includes('customer') || lowerQuery.includes('client')) {
    return `## Customer Analysis

Analyzing customer metrics for: "${query}"

### Customer Demographics:
- **Total Customers**: 38,500 unique customers
- **Average Age**: 42.3 years
- **Average Income**: HKD 485,000 annually
- **Multi-Policy Rate**: 23.5%

### Customer Behavior:
1. **Loyalty**: 23.5% of customers hold multiple policies
2. **Age Distribution**: Peak customer age range is 35-50 years
3. **Income Correlation**: Higher income customers tend to purchase higher coverage

### Strategic Insights:
- Target marketing to 30-35 age group for growth
- Develop cross-selling strategies for single-policy customers
- Create premium products for high-income segments`;
  }
  
  if (lowerQuery.includes('channel') || lowerQuery.includes('bank') || lowerQuery.includes('branch')) {
    return `## Channel Performance Analysis

Channel analysis for: "${query}"

### Channel Metrics:
- **Active Banks**: 12 partner banks
- **Active Branches**: 156 branches
- **Avg Policies per Bank**: 3,750 policies
- **Avg Policies per Branch**: 288 policies

### Performance Insights:
1. **Top Performers**: 3 banks generate 60% of total policies
2. **Branch Efficiency**: Urban branches outperform suburban by 40%
3. **Growth Opportunity**: 25% of branches are underperforming

### Optimization Recommendations:
- Invest in training for underperforming branches
- Expand partnerships with high-performing bank networks
- Implement digital tools to support branch operations`;
  }
  
  if (lowerQuery.includes('product') || lowerQuery.includes('rider') || lowerQuery.includes('coverage')) {
    return `## Product Analysis

Product performance analysis for: "${query}"

### Product Metrics:
- **Product Types**: 8 unique product categories
- **Rider Attachment Rate**: 67.8%
- **Avg Riders per Policy**: 2.3 riders
- **Total Coverage**: HKD 125B

### Product Insights:
1. **Popular Products**: Life insurance dominates with 45% market share
2. **Rider Success**: High rider attachment indicates good cross-selling
3. **Coverage Trends**: Average coverage per policy increased 15%

### Product Strategy:
- Develop new rider options for emerging customer needs
- Bundle popular riders with base products
- Focus on high-margin product categories`;
  }
  
  // Default response for general queries
  return `## Metrics Analysis

I've analyzed your query: "${query}"

### Available Metrics Categories:
1. **Sales Performance** - Premium income, policy counts, growth rates
2. **Customer Analysis** - Demographics, behavior, loyalty metrics
3. **Channel Analysis** - Bank and branch performance
4. **Product Analysis** - Product mix, rider attachment, coverage
5. **Financial Ratios** - Commission ratios, premium efficiency
6. **Time Trends** - Month-over-month and year-over-year comparisons

### Quick Insights:
- Overall business performance shows positive trends
- Customer acquisition is steady with room for optimization
- Channel performance varies significantly across regions
- Product diversification opportunities exist

Would you like me to dive deeper into any specific area?`;
};

export const queryMetricsWithAI = async (aiQuery: AIMetricsQuery): Promise<Message> => {
  const response = await generateAIMetricsResponse(aiQuery.query, aiQuery.context);
  
  return {
    id: Date.now().toString(),
    content: response,
    role: 'ai',
    timestamp: new Date()
  };
};

export const generateMetricsInsights = async (metricNames?: string[]): Promise<AIMetricsInsight[]> => {
  await delay(1000);
  
  const insights: AIMetricsInsight[] = [
    {
      title: "Premium Growth Acceleration",
      description: "Annual premium income shows strong 12% YoY growth, outpacing industry average of 8%",
      metrics: ["total_annual_premium_hkd", "premium_yoy"],
      recommendation: "Consider expanding successful product lines and targeting high-value customer segments",
      priority: "high"
    },
    {
      title: "Channel Performance Optimization",
      description: "Top 3 banks generate 60% of policies, indicating concentration risk and opportunity",
      metrics: ["active_banks_count", "policies_per_bank", "premium_per_bank"],
      recommendation: "Diversify channel partnerships and invest in underperforming branch training",
      priority: "medium"
    },
    {
      title: "Customer Cross-Selling Success",
      description: "Multi-policy rate of 23.5% shows good cross-selling, but room for improvement",
      metrics: ["multi_policy_rate", "policies_per_customer", "unique_customers"],
      recommendation: "Develop targeted cross-selling campaigns for single-policy customers",
      priority: "medium"
    },
    {
      title: "Rider Attachment Excellence",
      description: "67.8% rider attachment rate indicates strong product bundling success",
      metrics: ["rider_attachment_rate", "riders_per_policy", "total_riders_attached"],
      recommendation: "Expand rider portfolio and create new bundling opportunities",
      priority: "low"
    }
  ];
  
  // Filter insights based on requested metrics if provided
  if (metricNames && metricNames.length > 0) {
    return insights.filter(insight => 
      insight.metrics.some(metric => metricNames.includes(metric))
    );
  }
  
  return insights;
};

export const getAIMetricsRecommendations = async (category?: string): Promise<Message> => {
  await delay(800);
  
  let content = '';
  
  switch (category) {
    case 'sales_performance':
      content = `## Sales Performance Recommendations

### Priority Actions:
1. **Premium Optimization** - Review pricing strategies for 15% improvement potential
2. **New Business Focus** - Target 20% increase in new policy acquisitions
3. **High-Value Segments** - Develop premium products for affluent customers

### Key Metrics to Monitor:
- Total Annual Premium (HKD)
- New Business Policies
- Average Premium per Policy
- Premium YoY Growth

### Expected Impact:
- 15-20% revenue increase within 12 months
- Improved customer lifetime value
- Enhanced market position`;
      break;
      
    case 'customer_analysis':
      content = `## Customer Strategy Recommendations

### Customer Growth Initiatives:
1. **Age Targeting** - Focus marketing on 30-35 age group for 25% growth potential
2. **Cross-Selling** - Increase multi-policy rate from 23.5% to 35%
3. **Retention Programs** - Implement loyalty programs for high-value customers

### Metrics to Track:
- Customer Acquisition Cost
- Multi-Policy Rate
- Customer Lifetime Value
- Average Customer Age

### Projected Outcomes:
- 30% increase in customer lifetime value
- 40% improvement in cross-selling success
- Enhanced customer satisfaction scores`;
      break;
      
    default:
      content = `## AI-Powered Metrics Recommendations

### Overall Business Optimization:
1. **Data-Driven Decisions** - Implement real-time metrics monitoring
2. **Performance Benchmarking** - Compare against industry standards
3. **Predictive Analytics** - Use AI for forecasting and trend analysis

### Key Focus Areas:
- **Sales Growth** - 15% premium increase opportunity
- **Customer Expansion** - 25% cross-selling potential
- **Channel Optimization** - 20% efficiency improvement
- **Product Innovation** - New rider development opportunities

### Implementation Timeline:
- **Month 1-2**: Metrics infrastructure setup
- **Month 3-4**: AI model deployment
- **Month 5-6**: Performance optimization
- **Month 7-12**: Continuous improvement and scaling`;
  }
  
  return {
    id: Date.now().toString(),
    content,
    role: 'ai',
    timestamp: new Date()
  };
};

// Error types for better error handling
export enum MetricsAPIError {
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR'
}

export class MetricsAPIException extends Error {
  constructor(
    public type: MetricsAPIError,
    message: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'MetricsAPIException';
  }
}

// Real-time metrics API response interface
interface RealTimeMetricsResponse {
  metrics: MetricDefinition[];
  categories: MetricCategory[];
  summary: MetricsSummary;
  lastUpdated: string;
  status: 'success' | 'error';
  message?: string;
}

// Retry configuration
interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2
};

/**
 * Utility function to implement retry logic with exponential backoff
 */
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on authentication errors
      if (error instanceof MetricsAPIException && 
          error.type === MetricsAPIError.AUTHENTICATION_ERROR) {
        throw error;
      }
      
      // Don't retry on the last attempt
      if (attempt === config.maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = config.retryDelay * Math.pow(config.backoffMultiplier, attempt);
      console.warn(`API call failed (attempt ${attempt + 1}/${config.maxRetries + 1}), retrying in ${delay}ms...`, error);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};

/**
 * Enhanced error handling for fetch responses
 */
const handleAPIResponse = async (response: Response): Promise<any> => {
  if (!response.ok) {
    let errorType: MetricsAPIError;
    let errorMessage: string;
    
    switch (response.status) {
      case 401:
      case 403:
        errorType = MetricsAPIError.AUTHENTICATION_ERROR;
        errorMessage = 'Authentication failed. Please check your API credentials.';
        break;
      case 404:
        errorType = MetricsAPIError.SERVER_ERROR;
        errorMessage = 'Metrics endpoint not found. Please check the API configuration.';
        break;
      case 408:
        errorType = MetricsAPIError.TIMEOUT_ERROR;
        errorMessage = 'Request timeout. The server took too long to respond.';
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        errorType = MetricsAPIError.SERVER_ERROR;
        errorMessage = `Server error (${response.status}). Please try again later.`;
        break;
      default:
        errorType = MetricsAPIError.SERVER_ERROR;
        errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
    }
    
    // Try to get error details from response body
    try {
      const errorData = await response.json();
      if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // Ignore JSON parsing errors for error responses
    }
    
    throw new MetricsAPIException(errorType, errorMessage, response.status);
  }
  
  try {
    return await response.json();
  } catch (error) {
    throw new MetricsAPIException(
      MetricsAPIError.INVALID_RESPONSE,
      'Failed to parse response as JSON',
      response.status,
      error as Error
    );
  }
};

/**
 * Fetch real-time metrics data from the API with enhanced error handling and retry logic
 */
const fetchRealTimeMetrics = async () => {
  return retryWithBackoff(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${API_BASE_URL}/metricflow/metrics/all`, {
        method: 'GET',
        headers: getDefaultHeaders(),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return await handleAPIResponse(response);
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new MetricsAPIException(
          MetricsAPIError.TIMEOUT_ERROR,
          'Request timeout while fetching real-time metrics'
        );
      }
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new MetricsAPIException(
          MetricsAPIError.NETWORK_ERROR,
          'Network error while fetching real-time metrics. Please check your connection.'
        );
      }
      
      throw error;
    }
  });
};

/**
 * Check if real-time metrics API is available
 */
const isRealTimeMetricsAvailable = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for health check
    
    const response = await fetch(`${API_BASE_URL}/metricflow/health`, {
      method: 'GET',
      headers: getDefaultHeaders(),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.warn('Real-time metrics API health check failed:', error);
    return false;
  }
};

// ===== Metric Dimensions Lookup API (MCP) =====
export interface DimensionListResponse {
  dimensions: MetricDimension[];
  total?: number;
}

/**
 * Find common dimensions for a given metric name via MCP endpoint.
 * Backend: POST /watchmen/mcp/dimensions_by_metric
 */
export const findDimensionsByMetric = async (metricName: string): Promise<DimensionListResponse> => {
  await delay(250);
  try {
    const response = await fetch(`${API_BASE_URL}/metricflow/dimensions_by_metric?metric_name=${metricName}`, {
      method: 'GET',
      headers: getDefaultHeaders()
    });

    if (response.status === 404) {
      return getMockDimensionsByMetric(metricName);
    }

    const data = await checkResponse(response);
    // Accept both array and wrapped response for compatibility
    if (Array.isArray(data)) {
      return { dimensions: data as MetricDimension[], total: data.length };
    }
    if (data && Array.isArray(data.dimensions)) {
      return { dimensions: data.dimensions as MetricDimension[], total: (data as any).total ?? data.dimensions.length };
    }
    return { dimensions: [], total: 0 };
  } catch (error) {
    console.warn('Failed to find dimensions by metric, using mock data:', error);
    return getMockDimensionsByMetric(metricName);
  }
};

// Mock dimensions fallback when MCP endpoint is unavailable
const getMockDimensionsByMetric = (metricName: string): DimensionListResponse => {
  const dims: MetricDimension[] = [
    { name: 'Region', description: 'Geographic region', qualified_name: 'customer.region', importance: 0.7, dimensionType: DimensionType.GEO },
    { name: 'Channel', description: 'Sales channel', qualified_name: 'sales.channel', importance: 0.65, dimensionType: DimensionType.CATEGORICAL },
    { name: 'Customer Segment', description: 'Customer value segment', qualified_name: 'customer.segment', importance: 0.6, dimensionType: DimensionType.CATEGORICAL },
    { name: 'Time Period', description: 'Time-based window', qualified_name: 'time.period', importance: 0.55, dimensionType: DimensionType.TIME }
  ];
  return { dimensions: dims, total: dims.length };
};