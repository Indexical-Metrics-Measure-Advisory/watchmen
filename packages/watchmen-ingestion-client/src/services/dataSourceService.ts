import { API_BASE_URL, getDefaultHeaders } from '../utils/apiConfig';
import { authService } from './authService';

/**
 * Custom Error Class for DataSource Service
 */
export class DataSourceServiceError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'DataSourceServiceError';
  }
}



/**
 * DataSource Service Class
 * Aligned with moduleService/tableService patterns
 */
export class DataSourceService {
  private useMockData: boolean;

  constructor(useMockData: boolean = false) {
    this.useMockData = useMockData;
  }

  /**
   * Load all data sources (matches server endpoint: /watchmen/ingest/config/datasource/all)
   */
  async getAllDataSources(): Promise<any[]> {
    if (this.useMockData) {
      // Minimal mock items for development
      return [
        {
          dataSourceId: 'ds-1',
          name: 'Primary DB',
          type: 'postgres',
          tenantId: 'tenant-1',
          createdAt: '2024-01-01T00:00:00Z',
          createdBy: 'admin'
        },
        {
          dataSourceId: 'ds-2',
          name: 'Analytics Warehouse',
          type: 'bigquery',
          tenantId: 'tenant-1',
          createdAt: '2024-01-02T00:00:00Z',
          createdBy: 'admin'
        }
      ];
    }

    try {
      const response = await fetch(`${API_BASE_URL}/datasource/all`, {
        method: 'GET',
        headers: getDefaultHeaders()
      });

      if (!response.ok) {
        throw new DataSourceServiceError(
          `Failed to fetch data sources: ${response.status} ${response.statusText}`,
          response.status
        );
      }

      const dataSourceList: any[] = await response.json();
      return dataSourceList;
    } catch (error) {
      console.error('Error fetching data sources:', error);
      if (this.useMockData) {
        return [
          {
            dataSourceId: 'ds-1',
            name: 'Primary DB',
            type: 'postgres',
            tenantId: 'tenant-1',
            createdAt: '2024-01-01T00:00:00Z',
            createdBy: 'admin'
          }
        ];
      }
      throw new DataSourceServiceError(
        'Failed to fetch data sources',
        undefined,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Backward-compatible alias
   */
  async getAll(): Promise<any[]> {
    return this.getAllDataSources();
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
      const response = await fetch(`${API_BASE_URL}/datasource/health`, {
        method: 'GET',
        headers: getDefaultHeaders()
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
const dataSourceService = new DataSourceService();
export default dataSourceService;