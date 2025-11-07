import { moduleService } from './moduleService';
import { modelService } from './modelService';
import { tableService } from './tableService';

// Data type definitions
export interface FlowRelationshipData {
  modules: any[];
  models: any[];
  tables: any[];
}

export interface FlowDataCache {
  data: FlowRelationshipData | null;
  timestamp: number;
  error: string | null;
}

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
const CACHE_KEY = 'flow_relationship_data';

class FlowDataService {
  private cache: FlowDataCache = {
    data: null,
    timestamp: 0,
    error: null,
  };

  // Check if cache is valid
  private isCacheValid(): boolean {
    const now = Date.now();
    return this.cache.data !== null && 
           (now - this.cache.timestamp) < CACHE_DURATION &&
           this.cache.error === null;
  }

  // Clear cache
  public clearCache(): void {
    this.cache = {
      data: null,
      timestamp: 0,
      error: null,
    };
  }

  // Get all relationship data
  public async getAllRelationshipData(forceRefresh = false): Promise<FlowRelationshipData> {
    console.log('[FlowDataService] Starting data fetch, forceRefresh:', forceRefresh);
    
    // If there's valid cache and not forcing refresh, return cached data
    if (!forceRefresh && this.isCacheValid() && this.cache.data) {
      console.log('[FlowDataService] Using cached data');
      return this.cache.data;
    }

    try {
      console.log('[FlowDataService] Fetching fresh data from APIs');
      
      // Ensure services use remote data
      moduleService.setMockDataMode(false);
      modelService.setMockDataMode(false);
      tableService.setMockDataMode(false);

      // Fetch all data in parallel
      console.log('[FlowDataService] Making parallel API calls...');
      const [modulesData, modelsData, tablesData] = await Promise.all([
        moduleService.getAllModules(),
        modelService.getAllModels(), // Use getAllModels to get all model data
        tableService.getAllTables(),
      ]);

      console.log('[FlowDataService] API responses received:');
      console.log('- Modules:', modulesData?.length || 0, 'items');
      console.log('- Models:', modelsData?.length || 0, 'items');
      console.log('- Tables:', tablesData?.length || 0, 'items');

      // modelsData is already in array format, no additional processing needed
      const models = modelsData || [];

      const relationshipData: FlowRelationshipData = {
        modules: modulesData || [],
        models: models,
        tables: tablesData || [],
      };

      console.log('[FlowDataService] Relationship data prepared:', {
        modules: relationshipData.modules.length,
        models: relationshipData.models.length,
        tables: relationshipData.tables.length
      });

      // Update cache
      this.cache = {
        data: relationshipData,
        timestamp: Date.now(),
        error: null,
      };

      console.log('[FlowDataService] Data cached successfully');
      return relationshipData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('[FlowDataService] Error fetching data:', errorMessage);
      
      // Update cache error status
      this.cache = {
        data: null,
        timestamp: Date.now(),
        error: errorMessage,
      };

      throw new Error(`Failed to fetch relationship data: ${errorMessage}`);
    }
  }

  // Get cache status
  public getCacheStatus(): { 
    hasCache: boolean; 
    isValid: boolean; 
    age: number; 
    error: string | null;
  } {
    const now = Date.now();
    return {
      hasCache: this.cache.data !== null,
      isValid: this.isCacheValid(),
      age: now - this.cache.timestamp,
      error: this.cache.error,
    };
  }

  // Preload data
  public async preloadData(): Promise<void> {
    try {
      await this.getAllRelationshipData();
    } catch (error) {
      console.warn('Failed to preload flow data:', error);
    }
  }
}

// Export singleton instance
export const flowDataService = new FlowDataService();