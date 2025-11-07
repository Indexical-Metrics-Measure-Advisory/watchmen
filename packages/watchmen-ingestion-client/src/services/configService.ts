import apiService from './api';
import { ApiResponse } from '../models/api.models';
import { ModuleConfig, ModelConfig, TableConfig, ConfigurationData } from '../models/config.models';

// Configuration service class
class ConfigService {
  private baseUrl = '/configurations';
  
  // Get all available modules
  public async getModules(): Promise<ApiResponse<ModuleConfig[]>> {
    return apiService.get<ModuleConfig[]>('/modules');
  }
  
  // Get models for a specific module
  public async getModels(moduleId: string): Promise<ApiResponse<ModelConfig[]>> {
    return apiService.get<ModelConfig[]>(`/modules/${moduleId}/models`);
  }
  
  // Get tables for a specific model
  public async getTables(moduleId: string, modelId: string): Promise<ApiResponse<TableConfig[]>> {
    return apiService.get<TableConfig[]>(`/modules/${moduleId}/models/${modelId}/tables`);
  }
  
  // Save a configuration
  public async saveConfiguration(config: ConfigurationData): Promise<ApiResponse<any>> {
    return apiService.post<any>(this.baseUrl, config);
  }
  
  // Get a specific configuration by ID
  public async getConfiguration(id: string): Promise<ApiResponse<ConfigurationData>> {
    return apiService.get<ConfigurationData>(`${this.baseUrl}/${id}`);
  }
  
  // Update an existing configuration
  public async updateConfiguration(id: string, config: ConfigurationData): Promise<ApiResponse<any>> {
    return apiService.put<any>(`${this.baseUrl}/${id}`, config);
  }
  
  // Delete a configuration
  public async deleteConfiguration(id: string): Promise<ApiResponse<any>> {
    return apiService.delete<any>(`${this.baseUrl}/${id}`);
  }
  
  // Test a configuration
  public async testConfiguration(config: ConfigurationData): Promise<ApiResponse<any>> {
    return apiService.post<any>(`${this.baseUrl}/test`, config);
  }
}

// Export a singleton instance
export const configService = new ConfigService();

// Export default for flexibility
export default configService;