import { 
  CollectorTableConfig,
  TableStatus, 
  CreateTableRequest, 
  UpdateTableRequest, 
  TableFilterParams, 
  PaginatedTableResponse,
  Condition,
  JoinCondition,
  Dependence,
  JsonColumn,
  EntityCriteriaOperator,
  constructConditions,
  constructJoinConditions,
  constructDependencies,
  constructJsonColumns
} from '../models/table';
import { API_BASE_URL } from '../utils/apiConfig';
import { authService } from './authService';

/**
 * Mock data for development and testing
 * Updated to match CollectorTableConfig structure
 */
const mockCollectorConfigs: CollectorTableConfig[] = [
  {
    configId: '1',
    name: 'users',
    tableName: 'users_table',
    primaryKey: ['id'],
    objectKey: 'user_id',
    sequenceKey: 'sequence_id',
    modelName: 'UserModel',
    parentName: 'BaseModel',
    label: 'User Management',
    joinKeys: [
      {
        parentKey: { columnName: 'parent_id', operator: EntityCriteriaOperator.EQUALS, columnValue: null },
        childKey: { columnName: 'child_id', operator: EntityCriteriaOperator.EQUALS, columnValue: null }
      }
    ],
    dependOn: [
      { modelName: 'BaseModel', objectKey: 'base_id' }
    ],
    conditions: [
      { columnName: 'status', operator: EntityCriteriaOperator.EQUALS, columnValue: 'active' }
    ],
    jsonColumns: [
      {
        columnName: 'metadata',
        ignoredPath: ['temp'],
        needFlatten: true,
        flattenPath: ['data'],
        jsonPath: ['$.data']
      }
    ],
    auditColumn: 'audit_log',
    ignoredColumns: ['temp_column'],
    dataSourceId: 'ds-1',
    isList: false,
    triggered: true,
    tenantId: 'tenant-1',
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 'admin',
    lastModifiedAt: '2024-01-15T10:30:00Z',
    lastModifiedBy: 'admin',
    version: 1
  },
  {
    configId: '2',
    name: 'products',
    tableName: 'products_table',
    primaryKey: ['id', 'sku'],
    objectKey: 'product_id',
    sequenceKey: 'product_seq',
    modelName: 'ProductModel',
    parentName: 'CatalogModel',
    label: 'Product Catalog',
    joinKeys: [
      {
        parentKey: { columnName: 'category_id', operator: EntityCriteriaOperator.EQUALS, columnValue: null },
        childKey: { columnName: 'product_category_id', operator: EntityCriteriaOperator.EQUALS, columnValue: null }
      }
    ],
    dependOn: [
      { modelName: 'CategoryModel', objectKey: 'category_id' },
      { modelName: 'InventoryModel', objectKey: 'inventory_id' }
    ],
    conditions: [
      { columnName: 'is_active', operator: EntityCriteriaOperator.EQUALS, columnValue: 1 },
      { columnName: 'price', operator: EntityCriteriaOperator.GREATER, columnValue: 0 }
    ],
    jsonColumns: [
      {
        columnName: 'specifications',
        ignoredPath: ['internal'],
        needFlatten: false,
        flattenPath: [],
        jsonPath: ['$.specs']
      }
    ],
    auditColumn: 'product_audit',
    ignoredColumns: ['internal_notes'],
    dataSourceId: 'ds-2',
    isList: true,
    triggered: false,
    tenantId: 'tenant-1',
    createdAt: '2024-01-02T00:00:00Z',
    createdBy: 'admin',
    lastModifiedAt: '2024-01-14T15:45:00Z',
    lastModifiedBy: 'admin',
    version: 2
  }
];

// Use CollectorTableConfig directly
const mockTables: CollectorTableConfig[] = mockCollectorConfigs;


/**
 * Custom Error Class for Table Service
 */
export class TableServiceError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'TableServiceError';
  }
}

export const getDefaultHeaders = () => {
  // const headers = {
  //   'Content-Type': 'application/json',
  // };

  // Get token from logged-in user via authService
  const token = authService.getStoredToken();
 
    // headers["Authorization"] = `Bearer ${token}`;
  // headers["Authorization"] = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NjI0NDMxNzQsInN1YiI6Im1ldHJpY3NfYWRtaW4ifQ.U4-V2kTBBeW9dCEaCUWHhcyuuldy5EZYMrNJuhtaNCE";
  
  return {
          'Content-Type': 'application/json',
          'Accept': '*/*',
          'Authorization': `Bearer ${token}`,
        }

};

/**
 * Table Service Class
 * Simplified implementation following the provided code example pattern
 */
export class TableService {
  private useMockData: boolean;

  constructor(useMockData: boolean = false) {
    this.useMockData = useMockData;
  }

  /**
   * Get all tables (matches server endpoint: /collector/config/table/all)
   */
  async getAllTables(): Promise<CollectorTableConfig[]> {
    if (this.useMockData) {
      return mockTables;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/ingest/config/table/all`, {
        method: 'GET',
        headers: getDefaultHeaders()
      });

      if (!response.ok) {
        throw new TableServiceError(
          `Failed to fetch tables: ${response.status} ${response.statusText}`,
          response.status
        );
      }
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
       const tableConfigList: any[] = await response.json();
      
      // Transform backend data to match frontend models
      return tableConfigList.map(config => ({
        ...config,
        joinKeys: constructJoinConditions(config.joinKeys),
        conditions: constructConditions(config.conditions),
        dependOn: constructDependencies(config.dependOn),
        jsonColumns: constructJsonColumns(config.jsonColumns)
      })) as CollectorTableConfig[];
    } catch (error) {
      console.error('Error fetching tables:', error);
      // Fallback to mock data if enabled
      // if (this.useMockData) {
      //   return mockTables;
      // }
      throw new TableServiceError(
        'Failed to fetch tables',
        undefined,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Get all tables with pagination (for backward compatibility)
   */
  async getAllTablesWithPagination(params: TableFilterParams = {}): Promise<PaginatedTableResponse> {
    const allTables = await this.getAllTables();
    
    // Apply client-side filtering and pagination
    let filteredTables = allTables;
    
    // Apply search filter
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filteredTables = filteredTables.filter(table => 
        (table.name || '').toLowerCase().includes(searchLower) ||
        (table.label || '').toLowerCase().includes(searchLower) ||
        (table.tableName || '').toLowerCase().includes(searchLower)
      );
    }
    
    // Apply status filter - CollectorTableConfig doesn't have status, so we skip this
    // if (params.status && params.status !== 'all') {
    //   filteredTables = filteredTables.filter(table => table.status === params.status);
    // }
    
    // Apply schema filter - using modelName as schema equivalent
    if (params.schema) {
      filteredTables = filteredTables.filter(table => table.modelName === params.schema);
    }
    
    // Apply sorting
    if (params.sortBy) {
      filteredTables.sort((a, b) => {
        const aValue = a[params.sortBy as keyof CollectorTableConfig];
        const bValue = b[params.sortBy as keyof CollectorTableConfig];
        
        if (aValue < bValue) return params.sortOrder === 'desc' ? 1 : -1;
        if (aValue > bValue) return params.sortOrder === 'desc' ? -1 : 1;
        return 0;
      });
    }
    
    // Apply pagination
    const { page = 1, limit = 10 } = params;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const items = filteredTables.slice(startIndex, endIndex);
    
    return {
      items,
      total: filteredTables.length,
      page,
      limit,
      totalPages: Math.ceil(filteredTables.length / limit)
    };
  }

  /**
   * Get table by ID (using configId)
   */
  async getTableById(tableId: string): Promise<CollectorTableConfig> {
    if (this.useMockData) {
      const table = mockTables.find(t => t.configId === tableId);
      if (!table) throw new Error('Table not found');
      return table;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/tables/${tableId}`);
      if (!response.ok) throw new Error('Failed to fetch table details');
      return await response.json();
    } catch (error) {
      console.error('Error fetching table details:', error);
      if (this.useMockData) {
        const table = mockTables.find(t => t.configId === tableId);
        if (!table) throw new Error('Table not found');
        return table;
      }
      throw error;
    }
  }

  /**
   * Create new table
   */
  async createTable(tableData: CreateTableRequest): Promise<CollectorTableConfig> {
    if (this.useMockData) {
      const newTable: CollectorTableConfig = {
        ...tableData,
        configId: (mockTables.length + 1).toString(),
        lastModifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      mockTables.push(newTable);
      return newTable;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/ingest/table/config`, {
        method: 'POST',
        headers: getDefaultHeaders(),
        body: JSON.stringify(tableData),
      });
      if (!response.ok) throw new Error('Failed to create table');
      return await response.json();
    } catch (error) {
      console.error('Error creating table:', error);
      if (this.useMockData) {
        const newTable: CollectorTableConfig = {
          ...tableData,
          configId: (mockTables.length + 1).toString(),
          lastModifiedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };
        mockTables.push(newTable);
        return newTable;
      }
      throw error;
    }
  }

  /**
   * Update table
   */
  async updateTable(tableId: string, updateData: UpdateTableRequest): Promise<CollectorTableConfig> {
    if (this.useMockData) {
      const tableIndex = mockTables.findIndex(t => t.configId === tableId);
      if (tableIndex === -1) throw new Error('Table not found');
      
      mockTables[tableIndex] = {
        ...mockTables[tableIndex],
        ...updateData,
        lastModifiedAt: new Date().toISOString()
      };
      return mockTables[tableIndex];
    }

    try {
      const response = await fetch(`${API_BASE_URL}/ingest/table/config`, {
        method: 'POST',
        headers: getDefaultHeaders(),
        body: JSON.stringify(updateData),
      });
      if (!response.ok) throw new Error('Failed to update table');
      return await response.json();
    } catch (error) {
      console.error('Error updating table:', error);
      if (this.useMockData) {
        const tableIndex = mockTables.findIndex(t => t.configId === tableId);
        if (tableIndex === -1) throw new Error('Table not found');
        
        mockTables[tableIndex] = {
          ...mockTables[tableIndex],
          ...updateData,
          lastModifiedAt: new Date().toISOString()
        };
        return mockTables[tableIndex];
      }
      throw error;
    }
  }

  /**
   * Delete table
   */
  async deleteTable(tableId: string): Promise<void> {
    if (this.useMockData) {
      const tableIndex = mockTables.findIndex(t => t.configId === tableId);
      if (tableIndex === -1) throw new Error('Table not found');
      mockTables.splice(tableIndex, 1);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/tables/${tableId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete table');
    } catch (error) {
      console.error('Error deleting table:', error);
      if (this.useMockData) {
        const tableIndex = mockTables.findIndex(t => t.configId === tableId);
        if (tableIndex === -1) throw new Error('Table not found');
        mockTables.splice(tableIndex, 1);
        return;
      }
      throw error;
    }
  }

  /**
   * Delete multiple tables
   */
  async deleteTables(tableIds: string[]): Promise<void> {
    if (this.useMockData) {
      tableIds.forEach(id => {
        const tableIndex = mockTables.findIndex(t => t.configId === id);
        if (tableIndex !== -1) {
          mockTables.splice(tableIndex, 1);
        }
      });
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/tables/batch`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: tableIds }),
      });
      if (!response.ok) throw new Error('Failed to delete tables');
    } catch (error) {
      console.error('Error deleting tables:', error);
      if (this.useMockData) {
        tableIds.forEach(id => {
          const tableIndex = mockTables.findIndex(t => t.configId === id);
          if (tableIndex !== -1) {
            mockTables.splice(tableIndex, 1);
          }
        });
        return;
      }
      throw error;
    }
  }

  /**
   * Get tables by model name (equivalent to schema)
   */
  async getTablesBySchema(schema: string): Promise<CollectorTableConfig[]> {
    if (this.useMockData) {
      return mockTables.filter(table => table.modelName === schema);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/tables/schema/${schema}`);
      if (!response.ok) throw new Error('Failed to fetch tables by schema');
      return await response.json();
    } catch (error) {
      console.error('Error fetching tables by schema:', error);
      if (this.useMockData) {
        return mockTables.filter(table => table.modelName === schema);
      }
      throw error;
    }
  }

  /**
   * Get tables by tenant ID
   */
  async getTablesByTenantId(tenantId: string): Promise<CollectorTableConfig[]> {
    if (this.useMockData) {
      return mockTables.filter(table => table.tenantId === tenantId);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/tables/tenant/${tenantId}`);
      if (!response.ok) throw new Error('Failed to fetch tables by tenant');
      return await response.json();
    } catch (error) {
      console.error('Error fetching tables by tenant:', error);
      if (this.useMockData) {
        return mockTables.filter(table => table.tenantId === tenantId);
      }
      throw error;
    }
  }

  /**
   * Get tables by model name (removed moduleTriggerId as it doesn't exist in CollectorTableConfig)
   */
  async getTablesByModelName(modelName: string): Promise<CollectorTableConfig[]> {
    if (this.useMockData) {
      return mockTables.filter(table => table.modelName === modelName);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/tables/model/${modelName}`);
      if (!response.ok) throw new Error('Failed to fetch tables by model');
      return await response.json();
    } catch (error) {
      console.error('Error fetching tables by model:', error);
      if (this.useMockData) {
        return mockTables.filter(table => table.modelName === modelName);
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
      const response = await fetch(`${API_BASE_URL}/tables/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  // ===== CollectorTableConfig specific methods =====

  /**
   * Get all collector table configurations (raw backend format)
   */
  async getAllCollectorConfigs(): Promise<CollectorTableConfig[]> {
    if (this.useMockData) {
      return mockCollectorConfigs;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/collector/config/table/all`, {
        method: 'GET',
        headers: getDefaultHeaders(),
      });

      if (!response.ok) {
        throw new TableServiceError(
          `Failed to fetch collector configs: ${response.status} ${response.statusText}`,
          response.status
        );
      }

      const data = await response.json();
      return data.map((config: any) => this.processCollectorConfig(config));
    } catch (error) {
      if (error instanceof TableServiceError) {
        throw error;
      }
      throw new TableServiceError(
        'Failed to fetch collector table configurations',
        undefined,
        error as Error
      );
    }
  }

  /**
   * Get collector config by ID
   */
  async getCollectorConfigById(configId: string): Promise<CollectorTableConfig> {
    if (this.useMockData) {
      const config = mockCollectorConfigs.find(c => c.configId === configId);
      if (!config) {
        throw new TableServiceError(`Collector config with ID ${configId} not found`, 404);
      }
      return config;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/collector/config/table/${configId}`, {
        method: 'GET',
        headers: getDefaultHeaders(),
      });

      if (!response.ok) {
        throw new TableServiceError(
          `Failed to fetch collector config: ${response.status} ${response.statusText}`,
          response.status
        );
      }

      const data = await response.json();
      return this.processCollectorConfig(data);
    } catch (error) {
      if (error instanceof TableServiceError) {
        throw error;
      }
      throw new TableServiceError(
        `Failed to fetch collector config with ID ${configId}`,
        undefined,
        error as Error
      );
    }
  }

  /**
   * Create new collector table configuration
   */
  async createCollectorConfig(configData: Omit<CollectorTableConfig, 'configId' | 'createdAt' | 'lastModifiedAt' | 'version'>): Promise<CollectorTableConfig> {
    if (this.useMockData) {
      const newConfig: CollectorTableConfig = {
        ...configData,
        configId: `mock-${Date.now()}`,
        createdAt: new Date().toISOString(),
        lastModifiedAt: new Date().toISOString(),
        version: 1
      };
      mockCollectorConfigs.push(newConfig);
      return newConfig;
    }

    try {
      const processedData = this.prepareCollectorConfigForAPI(configData);
      
      const response = await fetch(`${API_BASE_URL}/collector/config/table`, {
        method: 'POST',
        headers: getDefaultHeaders(),
        body: JSON.stringify(processedData),
      });

      if (!response.ok) {
        throw new TableServiceError(
          `Failed to create collector config: ${response.status} ${response.statusText}`,
          response.status
        );
      }

      const data = await response.json();
      return this.processCollectorConfig(data);
    } catch (error) {
      if (error instanceof TableServiceError) {
        throw error;
      }
      throw new TableServiceError(
        'Failed to create collector table configuration',
        undefined,
        error as Error
      );
    }
  }

  /**
   * Update collector table configuration
   */
  async updateCollectorConfig(configId: string, updateData: Partial<Omit<CollectorTableConfig, 'configId' | 'createdAt' | 'createdBy'>>): Promise<CollectorTableConfig> {
    if (this.useMockData) {
      const index = mockCollectorConfigs.findIndex(c => c.configId === configId);
      if (index === -1) {
        throw new TableServiceError(`Collector config with ID ${configId} not found`, 404);
      }
      
      mockCollectorConfigs[index] = {
        ...mockCollectorConfigs[index],
        ...updateData,
        lastModifiedAt: new Date().toISOString(),
        version: (mockCollectorConfigs[index].version || 1) + 1
      };
      return mockCollectorConfigs[index];
    }

    try {
      const processedData = this.prepareCollectorConfigForAPI(updateData);
      
      const response = await fetch(`${API_BASE_URL}/collector/config/table/${configId}`, {
        method: 'PUT',
        headers: getDefaultHeaders(),
        body: JSON.stringify(processedData),
      });

      if (!response.ok) {
        throw new TableServiceError(
          `Failed to update collector config: ${response.status} ${response.statusText}`,
          response.status
        );
      }

      const data = await response.json();
      return this.processCollectorConfig(data);
    } catch (error) {
      if (error instanceof TableServiceError) {
        throw error;
      }
      throw new TableServiceError(
        `Failed to update collector config with ID ${configId}`,
        undefined,
        error as Error
      );
    }
  }

  /**
   * Delete collector table configuration
   */
  async deleteCollectorConfig(configId: string): Promise<void> {
    if (this.useMockData) {
      const index = mockCollectorConfigs.findIndex(c => c.configId === configId);
      if (index === -1) {
        throw new TableServiceError(`Collector config with ID ${configId} not found`, 404);
      }
      mockCollectorConfigs.splice(index, 1);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/collector/config/table/${configId}`, {
        method: 'DELETE',
        headers: getDefaultHeaders(),
      });

      if (!response.ok) {
        throw new TableServiceError(
          `Failed to delete collector config: ${response.status} ${response.statusText}`,
          response.status
        );
      }
    } catch (error) {
      if (error instanceof TableServiceError) {
        throw error;
      }
      throw new TableServiceError(
        `Failed to delete collector config with ID ${configId}`,
        undefined,
        error as Error
      );
    }
  }

  /**
   * Get collector configs by model name
   */
  async getCollectorConfigsByModel(modelName: string): Promise<CollectorTableConfig[]> {
    if (this.useMockData) {
      return mockCollectorConfigs.filter(c => c.modelName === modelName);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/collector/config/table/by-model/${modelName}`, {
        method: 'GET',
        headers: getDefaultHeaders(),
      });

      if (!response.ok) {
        throw new TableServiceError(
          `Failed to fetch collector configs by model: ${response.status} ${response.statusText}`,
          response.status
        );
      }

      const data = await response.json();
      return data.map((config: any) => this.processCollectorConfig(config));
    } catch (error) {
      if (error instanceof TableServiceError) {
        throw error;
      }
      throw new TableServiceError(
        `Failed to fetch collector configs for model ${modelName}`,
        undefined,
        error as Error
      );
    }
  }

  /**
   * Process raw collector config from API to ensure proper structure
   */
  private processCollectorConfig(rawConfig: any): CollectorTableConfig {
    return {
      ...rawConfig,
      joinKeys: constructJoinConditions(rawConfig.joinKeys),
      dependOn: constructDependencies(rawConfig.dependOn),
      conditions: constructConditions(rawConfig.conditions),
      jsonColumns: constructJsonColumns(rawConfig.jsonColumns),
    };
  }

  /**
   * Prepare collector config data for API submission
   */
  private prepareCollectorConfigForAPI(configData: any): any {
    // Process complex nested structures before sending to API
    const processedData = { ...configData };
    
    if (processedData.joinKeys) {
      processedData.joinKeys = constructJoinConditions(processedData.joinKeys);
    }
    
    if (processedData.dependOn) {
      processedData.dependOn = constructDependencies(processedData.dependOn);
    }
    
    if (processedData.conditions) {
      processedData.conditions = constructConditions(processedData.conditions);
    }
    
    if (processedData.jsonColumns) {
      processedData.jsonColumns = constructJsonColumns(processedData.jsonColumns);
    }
    
    return processedData;
  }
}

// Export singleton instance
export const tableService = new TableService();

// Export types
export type {
  CollectorTableConfig,
  CreateTableRequest,
  UpdateTableRequest,
  TableFilterParams,
  PaginatedTableResponse,
  TableStatus,
  Condition,
  JoinCondition,
  Dependence,
  JsonColumn
};