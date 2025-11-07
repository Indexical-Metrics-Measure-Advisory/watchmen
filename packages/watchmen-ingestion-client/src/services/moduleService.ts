import {
  Module,
  CreateModuleRequest,
  UpdateModuleRequest,
  ModulePaginationParams,
  PaginatedModuleResponse,
  ModuleStats,
  BatchOperationResult
} from '../models/module';
import { API_BASE_URL } from '../utils/apiConfig';
import { authService } from './authService';

/**
 * Mock data for development and testing
 */
const mockModules: Module[] = [
  {
    moduleId: 'policy_mgmt_001',
    moduleName: 'Policy Management',
    priority: 1,
    version: '1.0.0',
    tenantId: 'tenant_001',
    createdAt: '2024-01-15T10:00:00Z',
    createdBy: 'admin',
    lastModifiedAt: '2024-01-15T10:00:00Z',
    lastModifiedBy: 'admin'
  },
  {
    moduleId: 'claims_001',
    moduleName: 'Claims',
    priority: 2,
    version: '1.0.0',
    tenantId: 'tenant_001',
    createdAt: '2024-01-15T10:00:00Z',
    createdBy: 'admin',
    lastModifiedAt: '2024-01-15T10:00:00Z',
    lastModifiedBy: 'admin'
  },
  {
    moduleId: 'billing_001',
    moduleName: 'Billing System',
    priority: 3,
    version: '1.2.0',
    tenantId: 'tenant_001',
    createdAt: '2024-01-10T08:00:00Z',
    createdBy: 'admin',
    lastModifiedAt: '2024-01-20T14:30:00Z',
    lastModifiedBy: 'admin'
  },
  {
    moduleId: 'reporting_001',
    moduleName: 'Reporting Module',
    priority: 4,
    version: '2.1.0',
    tenantId: 'tenant_002',
    createdAt: '2024-01-05T12:00:00Z',
    createdBy: 'user1',
    lastModifiedAt: '2024-01-18T16:45:00Z',
    lastModifiedBy: 'user1'
  }
];

const mockModuleStats: ModuleStats = {
  total: 4,
  byTenant: {
    'tenant_001': 3,
    'tenant_002': 1
  },
  byVersion: {
    '1.0.0': 2,
    '1.2.0': 1,
    '2.1.0': 1
  },
  byPriority: {
    1: 1,
    2: 1,
    3: 1,
    4: 1
  },
  recentlyCreated: 4,
  recentlyModified: 4
};

/**
 * Custom Error Class for Module Service
 */
export class ModuleServiceError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ModuleServiceError';
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
 * Module Service Class
 * Following the tableService.ts pattern
 */
export class ModuleService {
  private useMockData: boolean;

  constructor(useMockData: boolean = false) {
    this.useMockData = useMockData;
  }

  /**
   * Get all modules (matches server endpoint: /ingest/config/module/all)
   */
  async getAllModules(): Promise<Module[]> {
    if (this.useMockData) {
      return mockModules;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/ingest/config/module/all`, {
        method: 'GET',
        headers: getDefaultHeaders()
      });

      if (!response.ok) {
        throw new ModuleServiceError(
          `Failed to fetch modules: ${response.status} ${response.statusText}`,
          response.status
        );
      }
      
      const moduleList: Module[] = await response.json();
      return moduleList;
    } catch (error) {
      console.error('Error fetching modules:', error);
      // Fallback to mock data if enabled
      if (this.useMockData) {
        return mockModules;
      }
      throw new ModuleServiceError(
        'Failed to fetch modules',
        undefined,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Get all modules with pagination (for backward compatibility)
   */
  async getAllModulesWithPagination(params: ModulePaginationParams = {}): Promise<PaginatedModuleResponse> {
    const allModules = await this.getAllModules();
    
    // Apply client-side filtering and pagination
    let filteredModules = allModules;
    
    // Apply search filter
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filteredModules = filteredModules.filter(module => 
        (module.moduleName || '').toLowerCase().includes(searchLower) ||
        (module.version || '').toLowerCase().includes(searchLower) ||
        (module.tenantId || '').toLowerCase().includes(searchLower)
      );
    }
    
    // Apply tenant filter
    if (params.tenantId) {
      filteredModules = filteredModules.filter(module => module.tenantId === params.tenantId);
    }
    
    // Apply sorting
    if (params.sortBy) {
      filteredModules.sort((a, b) => {
        const aValue = a[params.sortBy as keyof Module];
        const bValue = b[params.sortBy as keyof Module];
        
        if (aValue < bValue) return params.sortOrder === 'desc' ? 1 : -1;
        if (aValue > bValue) return params.sortOrder === 'desc' ? -1 : 1;
        return 0;
      });
    }
    
    // Apply pagination
    const { page = 1, limit = 10 } = params;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const data = filteredModules.slice(startIndex, endIndex);
    
    return {
      data,
      pagination: {
        page,
        limit,
        total: filteredModules.length,
        totalPages: Math.ceil(filteredModules.length / limit),
        hasNext: page < Math.ceil(filteredModules.length / limit),
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get module by ID
   */
  async getModuleById(moduleId: string): Promise<Module> {
    if (this.useMockData) {
      const module = mockModules.find(m => m.moduleId === moduleId);
      if (!module) throw new Error('Module not found');
      return module;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/modules/${moduleId}`, {
        method: 'GET',
        headers: getDefaultHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch module details');
      return await response.json();
    } catch (error) {
      console.error('Error fetching module details:', error);
      if (this.useMockData) {
        const module = mockModules.find(m => m.moduleId === moduleId);
        if (!module) throw new Error('Module not found');
        return module;
      }
      throw error;
    }
  }

  /**
   * Create new module
   */
  async createModule(moduleData: CreateModuleRequest): Promise<Module> {
    if (this.useMockData) {
       const newModule: Module = {
         ...moduleData,
         moduleId: (mockModules.length + 1).toString(),
         lastModifiedAt: new Date().toISOString(),
         lastModifiedBy: moduleData.createdBy || 'system',
         createdAt: new Date().toISOString()
       };
       mockModules.push(newModule);
       return newModule;
     }

    try {
      const response = await fetch(`${API_BASE_URL}/ingest/module/config`, {
        method: 'POST',
        headers: getDefaultHeaders(),
        body: JSON.stringify(moduleData),
      });
      if (!response.ok) throw new Error('Failed to create module');
      return await response.json();
    } catch (error) {
      console.error('Error creating module:', error);
      if (this.useMockData) {
         const newModule: Module = {
           ...moduleData,
           moduleId: (mockModules.length + 1).toString(),
           lastModifiedAt: new Date().toISOString(),
           lastModifiedBy: moduleData.createdBy || 'system',
           createdAt: new Date().toISOString()
         };
         mockModules.push(newModule);
         return newModule;
       }
      throw error;
    }
  }

  /**
   * Update module
   */
  async updateModule(moduleId: string, updateData: UpdateModuleRequest): Promise<Module> {
    if (this.useMockData) {
      const moduleIndex = mockModules.findIndex(m => m.moduleId === moduleId);
      if (moduleIndex === -1) throw new Error('Module not found');
      
      mockModules[moduleIndex] = {
        ...mockModules[moduleIndex],
        ...updateData,
        lastModifiedAt: new Date().toISOString()
      };
      return mockModules[moduleIndex];
    }

    try {
      const response = await fetch(`${API_BASE_URL}/ingest/module/config`, {
        method: 'POST',
        headers: getDefaultHeaders(),
        body: JSON.stringify(updateData),
      });
      if (!response.ok) throw new Error('Failed to update module');
      return await response.json();
    } catch (error) {
      console.error('Error updating module:', error);
      if (this.useMockData) {
        const moduleIndex = mockModules.findIndex(m => m.moduleId === moduleId);
        if (moduleIndex === -1) throw new Error('Module not found');
        
        mockModules[moduleIndex] = {
          ...mockModules[moduleIndex],
          ...updateData,
          lastModifiedAt: new Date().toISOString()
        };
        return mockModules[moduleIndex];
      }
      throw error;
    }
  }

  /**
   * Delete module
   */
  async deleteModule(moduleId: string): Promise<void> {
    if (this.useMockData) {
      const moduleIndex = mockModules.findIndex(m => m.moduleId === moduleId);
      if (moduleIndex === -1) throw new Error('Module not found');
      mockModules.splice(moduleIndex, 1);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/modules/${moduleId}`, {
        method: 'DELETE',
        headers: getDefaultHeaders()
      });
      if (!response.ok) throw new Error('Failed to delete module');
    } catch (error) {
      console.error('Error deleting module:', error);
      if (this.useMockData) {
        const moduleIndex = mockModules.findIndex(m => m.moduleId === moduleId);
        if (moduleIndex === -1) throw new Error('Module not found');
        mockModules.splice(moduleIndex, 1);
        return;
      }
      throw error;
    }
  }

  /**
   * Delete multiple modules
   */
  async deleteModules(moduleIds: string[]): Promise<BatchOperationResult> {
    if (this.useMockData) {
      const success: string[] = [];
      const failed: Array<{ id: string; error: string }> = [];
      
      moduleIds.forEach(id => {
        const moduleIndex = mockModules.findIndex(m => m.moduleId === id);
        if (moduleIndex !== -1) {
          mockModules.splice(moduleIndex, 1);
          success.push(id);
        } else {
          failed.push({ id, error: 'Module not found' });
        }
      });
      
      return {
        success,
        failed,
        total: moduleIds.length,
        successCount: success.length,
        failedCount: failed.length
      };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/modules/batch`, {
        method: 'DELETE',
        headers: getDefaultHeaders(),
        body: JSON.stringify({ ids: moduleIds }),
      });
      if (!response.ok) throw new Error('Failed to delete modules');
      return await response.json();
    } catch (error) {
      console.error('Error deleting modules:', error);
      if (this.useMockData) {
        const success: string[] = [];
        const failed: Array<{ id: string; error: string }> = [];
        
        moduleIds.forEach(id => {
          const moduleIndex = mockModules.findIndex(m => m.moduleId === id);
          if (moduleIndex !== -1) {
            mockModules.splice(moduleIndex, 1);
            success.push(id);
          } else {
            failed.push({ id, error: 'Module not found' });
          }
        });
        
        return {
          success,
          failed,
          total: moduleIds.length,
          successCount: success.length,
          failedCount: failed.length
        };
      }
      throw error;
    }
  }

  /**
   * Get modules by tenant ID
   */
  async getModulesByTenantId(tenantId: string): Promise<Module[]> {
    if (this.useMockData) {
      return mockModules.filter(module => module.tenantId === tenantId);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/modules/tenant/${tenantId}`, {
        method: 'GET',
        headers: getDefaultHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch modules by tenant');
      return await response.json();
    } catch (error) {
      console.error('Error fetching modules by tenant:', error);
      if (this.useMockData) {
        return mockModules.filter(module => module.tenantId === tenantId);
      }
      throw error;
    }
  }

  /**
   * Get module statistics
   */
  async getModuleStats(): Promise<ModuleStats> {
    if (this.useMockData) {
      return mockModuleStats;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/modules/stats`, {
        method: 'GET',
        headers: getDefaultHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch module statistics');
      return await response.json();
    } catch (error) {
      console.error('Error fetching module statistics:', error);
      if (this.useMockData) {
        return mockModuleStats;
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
      const response = await fetch(`${API_BASE_URL}/modules/health`, {
        method: 'GET',
        headers: getDefaultHeaders()
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Create and export module service instance
export const moduleService = new ModuleService();