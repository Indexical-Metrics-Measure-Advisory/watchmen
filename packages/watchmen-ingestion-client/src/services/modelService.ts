import { Model } from '../models/model';
import { API_BASE_URL } from '../utils/apiConfig';
import { authService } from './authService';

/**
 * Pagination Query Parameters
 */
interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: keyof Model;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  tenantId?: string;
}

/**
 * Paginated Response Data
 */
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Create Model Request Data (excluding auto-generated fields)
 */
type CreateModelRequest = Omit<Model, 'createdAt' | 'lastModifiedAt'>;

/**
 * Update Model Request Data (partial fields optional)
 */
type UpdateModelRequest = Partial<Omit<Model,  'createdAt' | 'createdBy'>>;

/**
 * Model Statistics
 */
interface ModelStats {
  total: number;
  byTenant: Record<string, number>;
  byModule: Record<string, number>;
  byVersion: Record<string, number>;
  recentlyCreated: number;
  recentlyModified: number;
}

/**
 * Batch Operation Result
 */
interface BatchOperationResult {
  success: string[];
  failed: Array<{ id: string; error: string }>;
  total: number;
  successCount: number;
  failedCount: number;
}

/**
 * Mock data for development and testing
 */
const mockModels: Model[] = [
  {
    modelId: 'policy_001',
    modelName: 'Policy',
    dependOn: [],
    rawTopicCode: 'POLICY_TOPIC',
    isParalleled: true,
    version: '1.0.0',
    tenantId: 'tenant_001',
    createdAt: '2024-01-15T10:00:00Z',
    createdBy: 'admin',
    lastModifiedAt: '2024-01-15T10:00:00Z',
    lastModifiedBy: 'admin',
    moduleId: 'policy_mgmt_001',
    priority: 1,
    sendType: 'raw-topic'
  },
  {
    modelId: 'customer_001',
    modelName: 'Customer',
    dependOn: [],
    rawTopicCode: 'CUSTOMER_TOPIC',
    isParalleled: false,
    version: '1.2.0',
    tenantId: 'tenant_001',
    createdAt: '2024-01-10T08:30:00Z',
    createdBy: 'admin',
    lastModifiedAt: '2024-01-20T14:15:00Z',
    lastModifiedBy: 'system',
    moduleId: 'customer_mgmt_001',
    priority: 2,
    sendType: 'cloud-file',
    dataSourceId: 'ds-3'
  },
  {
    modelId: 'order_001',
    modelName: 'Order',
    dependOn: ['customer_001'],
    rawTopicCode: 'ORDER_TOPIC',
    isParalleled: true,
    version: '1.1.0',
    tenantId: 'tenant_001',
    createdAt: '2024-01-12T12:00:00Z',
    createdBy: 'admin',
    lastModifiedAt: '2024-01-18T16:45:00Z',
    lastModifiedBy: 'developer',
    moduleId: 'order_mgmt_001',
    priority: 3
  }
];

const mockModelStats: ModelStats = {
  total: 3,
  byTenant: {
    'tenant_001': 3
  },
  byModule: {
    'policy_mgmt_001': 1,
    'customer_mgmt_001': 1,
    'order_mgmt_001': 1
  },
  byVersion: {
    '1.0.0': 1,
    '1.1.0': 1,
    '1.2.0': 1
  },
  recentlyCreated: 3,
  recentlyModified: 3
};

/**
 * Custom Error Class for Model Service
 */
export class ModelServiceError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ModelServiceError';
  }
}

export const getDefaultHeaders = () => {
  // Get token from logged-in user via authService
  const token = authService.getStoredToken();
 
  return {
    'Content-Type': 'application/json',
    'Accept': '*/*',
    'Authorization': `Bearer ${token}`,
  };
};

/**
 * Model Service Class
 * Following the moduleService.ts pattern
 */
export class ModelService {
  private useMockData: boolean;

  constructor(useMockData: boolean = false) {
    this.useMockData = useMockData;
  }

  /**
   * Get all models (matches server endpoint: /ingest/config/model/all)
   */
  async getAllModels(): Promise<Model[]> {
    if (this.useMockData) {
      return mockModels;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/ingest/config/model/all`, {
        method: 'GET',
        headers: getDefaultHeaders()
      });

      if (!response.ok) {
        throw new ModelServiceError(
          `Failed to fetch models: ${response.status} ${response.statusText}`,
          response.status
        );
      }
      
      const data = await response.json();
      
      // Handle different response formats
      if (Array.isArray(data)) {
        return data;
      } else if (data.success && data.data && Array.isArray(data.data)) {
        return data.data;
      } else if (data.data && Array.isArray(data.data)) {
        return data.data;
      } else {
        console.warn('[ModelService] Invalid response format, falling back to mock data');
        return mockModels;
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      // Fallback to mock data if enabled
      if (this.useMockData) {
        return mockModels;
      }
      throw new ModelServiceError(
        'Failed to fetch models',
        undefined,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Get all models with pagination (for backward compatibility)
   */
  async getAllModelsWithPagination(params: PaginationParams = {}): Promise<PaginatedResponse<Model>> {
    const allModels = await this.getAllModels();
    
    // Apply client-side filtering and pagination
    let filteredModels = allModels;
    
    // Apply search filter
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filteredModels = filteredModels.filter(model => 
        (model.modelName || '').toLowerCase().includes(searchLower) ||
        (Array.isArray(model.dependOn) ? model.dependOn.join(' ') : (model.dependOn || '')).toLowerCase().includes(searchLower) ||
        (model.rawTopicCode || '').toLowerCase().includes(searchLower)
      );
    }
    
    // Apply tenant filter
    if (params.tenantId) {
      filteredModels = filteredModels.filter(model => model.tenantId === params.tenantId);
    }
    
    // Apply sorting
    if (params.sortBy) {
      filteredModels.sort((a, b) => {
        const aValue = a[params.sortBy as keyof Model];
        const bValue = b[params.sortBy as keyof Model];
        
        if (aValue < bValue) return params.sortOrder === 'desc' ? 1 : -1;
        if (aValue > bValue) return params.sortOrder === 'desc' ? -1 : 1;
        return 0;
      });
    }
    
    // Apply pagination
    const { page = 1, limit = 10 } = params;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const data = filteredModels.slice(startIndex, endIndex);
    
    return {
      data,
      pagination: {
        page,
        limit,
        total: filteredModels.length,
        totalPages: Math.ceil(filteredModels.length / limit),
        hasNext: page < Math.ceil(filteredModels.length / limit),
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get model by ID
   */
  async getModelById(modelId: string): Promise<Model> {
    if (this.useMockData) {
      const model = mockModels.find(m => m.modelId === modelId);
      if (!model) throw new ModelServiceError('Model not found', 404);
      return model;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/ingest/config/model/${encodeURIComponent(modelId)}`, {
        method: 'GET',
        headers: getDefaultHeaders()
      });
      
      if (!response.ok) {
        throw new ModelServiceError(
          `Failed to fetch model: ${response.status} ${response.statusText}`,
          response.status
        );
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching model details:', error);
      if (this.useMockData) {
        const model = mockModels.find(m => m.modelId === modelId);
        if (!model) throw new ModelServiceError('Model not found', 404);
        return model;
      }
      throw error;
    }
  }

  /**
   * Create new model
   */
  async createModel(modelData: CreateModelRequest): Promise<Model> {
    if (this.useMockData) {
      const newModel: Model = {
        ...modelData,
        createdAt: new Date().toISOString(),
        lastModifiedAt: new Date().toISOString()
      };
      mockModels.push(newModel);
      return newModel;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/ingest/config/model/`, {
        method: 'POST',
        headers: getDefaultHeaders(),
        body: JSON.stringify(modelData),
      });
      
      if (!response.ok) {
        throw new ModelServiceError(
          `Failed to create model: ${response.status} ${response.statusText}`,
          response.status
        );
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating model:', error);
      if (this.useMockData) {
        const newModel: Model = {
          ...modelData,
          createdAt: new Date().toISOString(),
          lastModifiedAt: new Date().toISOString()
        };
        mockModels.push(newModel);
        return newModel;
      }
      throw error;
    }
  }

  /**
   * Update model
   */
  async updateModel(modelId: string, updateData: UpdateModelRequest): Promise<Model> {
    // console.log('ModelService.updateModel called with:', { modelId, updateData });
    // console.log('useMockData mode:', this.useMockData);
    updateData.modelId = modelId;
    
    if (this.useMockData) {
      // console.log('Using mock data for update');
      const modelIndex = mockModels.findIndex(m => m.modelId === modelId);
      if (modelIndex === -1) throw new ModelServiceError('Model not found', 404);
      
      mockModels[modelIndex] = {
        ...mockModels[modelIndex],
        ...updateData,
        lastModifiedAt: new Date().toISOString()
      };
      return mockModels[modelIndex];
    }

    try {
      
      const response = await fetch(`${API_BASE_URL}/ingest/config/model/`, {
        method: 'POST',
        headers: getDefaultHeaders(),
        body: JSON.stringify({
          ...updateData,
          lastModifiedAt: new Date().toISOString()
        }),
      });
      
      console.log('API response status:', response.status);
      
      if (!response.ok) {
        throw new ModelServiceError(
          `Failed to update model: ${response.status} ${response.statusText}`,
          response.status
        );
      }
      
      const result = await response.json();
      console.log('API response data:', result);
      return result;
    } catch (error) {
      console.error('Error updating model:', error);
      console.log('Falling back to mock data due to error');
      // if (this.useMockData) {
      //   const modelIndex = mockModels.findIndex(m => m.modelId === modelId);
      //   if (modelIndex === -1) throw new ModelServiceError('Model not found', 404);
        
      //   mockModels[modelIndex] = {
      //     ...mockModels[modelIndex],
      //     ...updateData,
      //     lastModifiedAt: new Date().toISOString()
      //   };
      //   return mockModels[modelIndex];
      // }
      throw error;
    }
  }

  /**
   * Delete model
   */
  async deleteModel(modelId: string): Promise<void> {
    if (this.useMockData) {
      const modelIndex = mockModels.findIndex(m => m.modelId === modelId);
      if (modelIndex === -1) throw new ModelServiceError('Model not found', 404);
      mockModels.splice(modelIndex, 1);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/ingest/config/model/${encodeURIComponent(modelId)}`, {
        method: 'DELETE',
        headers: getDefaultHeaders()
      });
      
      if (!response.ok) {
        throw new ModelServiceError(
          `Failed to delete model: ${response.status} ${response.statusText}`,
          response.status
        );
      }
    } catch (error) {
      console.error('Error deleting model:', error);
      if (this.useMockData) {
        const modelIndex = mockModels.findIndex(m => m.modelId === modelId);
        if (modelIndex === -1) throw new ModelServiceError('Model not found', 404);
        mockModels.splice(modelIndex, 1);
        return;
      }
      throw error;
    }
  }

  /**
   * Delete multiple models
   */
  async deleteModels(modelIds: string[]): Promise<BatchOperationResult> {
    if (this.useMockData) {
      const success: string[] = [];
      const failed: Array<{ id: string; error: string }> = [];
      
      modelIds.forEach(id => {
        const modelIndex = mockModels.findIndex(m => m.modelId === id);
        if (modelIndex !== -1) {
          mockModels.splice(modelIndex, 1);
          success.push(id);
        } else {
          failed.push({ id, error: 'Model not found' });
        }
      });
      
      return {
        success,
        failed,
        total: modelIds.length,
        successCount: success.length,
        failedCount: failed.length
      };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/ingest/config/model/batch`, {
        method: 'DELETE',
        headers: getDefaultHeaders(),
        body: JSON.stringify({ modelIds }),
      });
      
      if (!response.ok) {
        throw new ModelServiceError(
          `Failed to delete models: ${response.status} ${response.statusText}`,
          response.status
        );
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error deleting models:', error);
      if (this.useMockData) {
        const success: string[] = [];
        const failed: Array<{ id: string; error: string }> = [];
        
        modelIds.forEach(id => {
          const modelIndex = mockModels.findIndex(m => m.modelId === id);
          if (modelIndex !== -1) {
            mockModels.splice(modelIndex, 1);
            success.push(id);
          } else {
            failed.push({ id, error: 'Model not found' });
          }
        });
        
        return {
          success,
          failed,
          total: modelIds.length,
          successCount: success.length,
          failedCount: failed.length
        };
      }
      throw error;
    }
  }

  /**
   * Get models by module ID
   */
  async getModelsByModuleId(moduleId: string): Promise<Model[]> {
    if (this.useMockData) {
      return mockModels.filter(model => model.moduleId === moduleId);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/ingest/config/model/module/${encodeURIComponent(moduleId)}`, {
        method: 'GET',
        headers: getDefaultHeaders()
      });
      
      if (!response.ok) {
        throw new ModelServiceError(
          `Failed to fetch models by module: ${response.status} ${response.statusText}`,
          response.status
        );
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching models by module:', error);
      if (this.useMockData) {
        return mockModels.filter(model => model.moduleId === moduleId);
      }
      throw error;
    }
  }

  /**
   * Get models by tenant ID
   */
  async getModelsByTenantId(tenantId: string): Promise<Model[]> {
    if (this.useMockData) {
      return mockModels.filter(model => model.tenantId === tenantId);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/ingest/config/model/tenant/${encodeURIComponent(tenantId)}`, {
        method: 'GET',
        headers: getDefaultHeaders()
      });
      
      if (!response.ok) {
        throw new ModelServiceError(
          `Failed to fetch models by tenant: ${response.status} ${response.statusText}`,
          response.status
        );
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching models by tenant:', error);
      if (this.useMockData) {
        return mockModels.filter(model => model.tenantId === tenantId);
      }
      throw error;
    }
  }

  /**
   * Search models
   */
  async searchModels(params: {
    query?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{ models: Model[]; total: number; page: number; limit: number }> {
    if (this.useMockData) {
      let filteredModels = mockModels;
      
      if (params.query) {
        const queryLower = params.query.toLowerCase();
        filteredModels = filteredModels.filter(model => 
          (model.modelName || '').toLowerCase().includes(queryLower) ||
          (Array.isArray(model.dependOn) ? model.dependOn.join(' ') : (model.dependOn || '')).toLowerCase().includes(queryLower) ||
          (model.rawTopicCode || '').toLowerCase().includes(queryLower)
        );
      }
      
      const { page = 1, limit = 10 } = params;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const models = filteredModels.slice(startIndex, endIndex);
      
      return {
        models,
        total: filteredModels.length,
        page,
        limit
      };
    }

    const queryParams = new URLSearchParams();
    
    if (params.query) queryParams.append('query', params.query);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    
    // Default sort by creation time
    if (!params.sortBy) {
      queryParams.append('sortBy', 'createdAt');
      queryParams.append('sortOrder', 'desc');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/ingest/config/model/search?${queryParams}`, {
        method: 'GET',
        headers: getDefaultHeaders()
      });
      
      if (!response.ok) {
        throw new ModelServiceError(
          `Failed to search models: ${response.status} ${response.statusText}`,
          response.status
        );
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error searching models:', error);
      if (this.useMockData) {
        let filteredModels = mockModels;
        
        if (params.query) {
          const queryLower = params.query.toLowerCase();
          filteredModels = filteredModels.filter(model => 
            (model.modelName || '').toLowerCase().includes(queryLower) ||
            (Array.isArray(model.dependOn) ? model.dependOn.join(' ') : (model.dependOn || '')).toLowerCase().includes(queryLower) ||
            (model.rawTopicCode || '').toLowerCase().includes(queryLower)
          );
        }
        
        const { page = 1, limit = 10 } = params;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const models = filteredModels.slice(startIndex, endIndex);
        
        return {
          models,
          total: filteredModels.length,
          page,
          limit
        };
      }
      throw error;
    }
  }

  /**
   * Get model statistics
   */
  async getModelStats(): Promise<ModelStats> {
    if (this.useMockData) {
      return mockModelStats;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/ingest/config/model/stats`, {
        method: 'GET',
        headers: getDefaultHeaders()
      });
      
      if (!response.ok) {
        throw new ModelServiceError(
          `Failed to fetch model statistics: ${response.status} ${response.statusText}`,
          response.status
        );
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching model statistics:', error);
      if (this.useMockData) {
        return mockModelStats;
      }
      throw error;
    }
  }

  /**
   * Sync raw topic structure
   */
  async syncRawTopicStructure(modelName: string): Promise<void> {
    if (this.useMockData) {
      // Mock implementation
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/ingest/config/model/sync/raw/topic?modelName=${encodeURIComponent(modelName)}`, {
        method: 'GET',
        headers: getDefaultHeaders()
      });

      if (!response.ok) {
        throw new ModelServiceError(
          `Failed to sync raw topic structure: ${response.status} ${response.statusText}`,
          response.status
        );
      }
    } catch (error) {
      console.error('Error syncing raw topic structure:', error);
      if (this.useMockData) {
        return;
      }
      throw error;
    }
  }

  /**
   * Fetch raw topic definition by code
   */
  async fetchRawTopic(topicCode: string): Promise<any> {
    if (this.useMockData) {
      // Mock implementation
      return {
        topicId: 'mock-topic-id',
        name: topicCode,
        type: 'raw',
        factors: [
          { factorId: 'f1', name: 'id', type: 'text' },
          { factorId: 'f2', name: 'name', type: 'text' },
          { factorId: 'f3', name: 'amount', type: 'number' }
        ]
      };
    }

    try {
      // Assuming endpoint pattern based on syncRawTopicStructure
      // Using /ingest/config/topic/name/{name} pattern which is common in this project
      const response = await fetch(`${API_BASE_URL}/ingest/config/topic/name/${encodeURIComponent(topicCode)}`, {
        method: 'GET',
        headers: getDefaultHeaders()
      });

      if (!response.ok) {
        throw new ModelServiceError(
          `Failed to fetch raw topic: ${response.status} ${response.statusText}`,
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching raw topic:', error);
      if (this.useMockData) {
        return { error: 'Mock data: Failed to fetch topic' };
      }
      throw error;
    }
  }

  /**
   * Set mock data mode
   */
  setMockDataMode(useMockData: boolean): void {
    this.useMockData = useMockData;
  }

  /**
   * Get current mock data mode
   */
  getMockDataMode(): boolean {
    return this.useMockData;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    if (this.useMockData) {
      return true;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/ingest/config/model/health`, {
        method: 'GET',
        headers: getDefaultHeaders()
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Create and export model service instance
export const modelService = new ModelService();

// Export types
export type {
  PaginationParams,
  PaginatedResponse,
  CreateModelRequest,
  UpdateModelRequest,
  ModelStats,
  BatchOperationResult,
};