import { API_BASE_URL, getDefaultHeaders } from '../utils/apiConfig';
import { authService } from './authService';

/**
 * A name/value pair attached to a data source. Mirrors watchmen_model.system.DataSourceParam;
 * `value` is `Union[str, bool]` on the backend, so we accept either here.
 */
export interface DataSourceParam {
  name?: string;
  value?: string | boolean;
}

/**
 * Data source row returned by GET /datasource/all.
 * Mirrors watchmen_model.system.DataSource (subset used by the monitor UI).
 */
export interface DataSourceItem {
  dataSourceId: string;
  dataSourceCode?: string;
  dataSourceType?: string;
  name?: string;
  host?: string;
  port?: string;
  tenantId?: string;
  createdAt?: string;
  createdBy?: string;
  /**
   * Arbitrary name/value params. Backend `GET /datasource/all` returns this list
   * verbatim (only `password` is hidden). Used to flag collector source databases.
   */
  params?: DataSourceParam[];
}

/**
 * A data source is the collector source database when one of its params has
 * name === 'collector' and value === 'true' (string, case-sensitive). Mirrors
 * `ask_datasource_by_param_name` in watchmen-collector-kernel/storage_helper.py.
 */
export const isCollectorDataSource = (ds: { params?: DataSourceParam[] } | undefined | null): boolean => {
  if (!ds?.params) return false;
  return ds.params.some((p) => p.name === 'collector' && p.value === 'true');
};

/**
 * Per-source probe result returned by GET /datasource/health.
 */
export interface DataSourceHealthItem {
  dataSourceId: string;
  name?: string;
  type?: string;
  status: 'ok' | 'error' | 'skipped' | 'timeout';
  latencyMs?: number | null;
  error?: string | null;
}

export interface DataSourceHealthReport {
  checkedAt: string;
  sources: DataSourceHealthItem[];
}

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
  async getAllDataSources(): Promise<DataSourceItem[]> {
    if (this.useMockData) {
      // Minimal mock items for development
      return [
        {
          dataSourceId: 'ds-1',
          name: 'Primary DB',
          dataSourceCode: 'ds-1',
          dataSourceType: 'postgres',
          tenantId: 'tenant-1',
          createdAt: '2024-01-01T00:00:00Z',
          createdBy: 'admin',
          params: [{ name: 'collector', value: 'true' }],
        },
        {
          dataSourceId: 'ds-2',
          name: 'Analytics Warehouse',
          dataSourceCode: 'ds-2',
          dataSourceType: 'bigquery',
          tenantId: 'tenant-1',
          createdAt: '2024-01-02T00:00:00Z',
          createdBy: 'admin'
        },
        {
          dataSourceId: 'ds-3',
          name: 'S3 Bucket',
          dataSourceCode: 'ds-3',
          dataSourceType: 's3',
          tenantId: 'tenant-1',
          createdAt: '2024-01-03T00:00:00Z',
          createdBy: 'admin'
        },
        {
          dataSourceId: 'ds-4',
          name: 'Azure Blob Storage',
          dataSourceCode: 'ds-4',
          dataSourceType: 'azure-blob',
          tenantId: 'tenant-1',
          createdAt: '2024-01-04T00:00:00Z',
          createdBy: 'admin'
        },
        {
          dataSourceId: 'ds-5',
          dataSourceCode: 'ds-5',
          name: 'Aliyun OSS',
          dataSourceType: 'ali-oss',
          tenantId: 'tenant-1',
          createdAt: '2024-01-05T00:00:00Z',
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

      const dataSourceList: DataSourceItem[] = await response.json();
      return dataSourceList;
    } catch (error) {
      console.error('Error fetching data sources:', error);
      if (this.useMockData) {
        return [
          {
            dataSourceId: 'ds-1',
            name: 'Primary DB',
            dataSourceType: 'postgres',
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
  async getAll(): Promise<DataSourceItem[]> {
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
   * Health check (lightweight, only verifies the endpoint is reachable)
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

  /**
   * Probe every data source connectivity (matches server endpoint: /datasource/health)
   */
  async checkDataSourceHealth(): Promise<DataSourceHealthReport> {
    if (this.useMockData) {
      return { checkedAt: new Date().toISOString(), sources: [] };
    }
    const response = await fetch(`${API_BASE_URL}/datasource/health`, {
      method: 'GET',
      headers: getDefaultHeaders()
    });
    if (!response.ok) {
      throw new DataSourceServiceError(
        `Failed to check data source health: ${response.status} ${response.statusText}`,
        response.status
      );
    }
    return response.json();
  }
}

// Export singleton instance
const dataSourceService = new DataSourceService();
export default dataSourceService;