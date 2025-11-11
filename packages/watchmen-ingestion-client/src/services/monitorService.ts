import apiService from './api';
import { ApiResponse } from '../models/api.models';
import { IngestionEvent, MonitoringSummary, PaginatedEventsResponse, EventResultRecord } from '../models/monitor.models';

// Monitoring service class
class MonitorService {
  private baseUrl = '/monitoring';
  
  // Get all ingestion events
  public async getIngestionEvents(): Promise<ApiResponse<IngestionEvent[]>> {
    return apiService.get<IngestionEvent[]>(`${this.baseUrl}/events`);
  }
  
  // Get ingestion events filtered by module
  public async getIngestionEventsByModule(moduleId: string): Promise<ApiResponse<IngestionEvent[]>> {
    return apiService.get<IngestionEvent[]>(`${this.baseUrl}/events`, { module: moduleId });
  }
  
  // Get monitoring summary
  public async getMonitoringSummary(): Promise<ApiResponse<MonitoringSummary>> {
    return apiService.get<MonitoringSummary>(`${this.baseUrl}/summary`);
  }
  
  // Get monitoring summary for a specific module
  public async getModuleMonitoringSummary(moduleId: string): Promise<ApiResponse<MonitoringSummary>> {
    return apiService.get<MonitoringSummary>(`${this.baseUrl}/modules/${moduleId}/summary`);
  }
  
  // Retry a failed ingestion event
  public async retryIngestionEvent(eventId: string): Promise<ApiResponse<any>> {
    return apiService.post<any>(`${this.baseUrl}/events/${eventId}/retry`);
  }
  
  // Cancel a running ingestion event
  public async cancelIngestionEvent(eventId: string): Promise<ApiResponse<any>> {
    return apiService.post<any>(`${this.baseUrl}/events/${eventId}/cancel`);
  }
  
  // Get detailed logs for an ingestion event
  public async getIngestionEventLogs(eventId: string): Promise<ApiResponse<any>> {
    return apiService.get<any>(`${this.baseUrl}/events/${eventId}/logs`);
  }

  // ===== New APIs: Event triggers and detailed records (two-level UI) =====
  // Get paginated event triggers
  public async getEventTriggers(pageNumber: number, pageSize: number): Promise<ApiResponse<PaginatedEventsResponse>> {
    return apiService.get<PaginatedEventsResponse>(`${this.baseUrl}/events/triggers`, { pageNumber, pageSize });
  }

  // Get detailed event result records by eventTriggerId
  public async getEventResultRecords(eventTriggerId: string): Promise<ApiResponse<EventResultRecord[]>> {
    return apiService.get<EventResultRecord[]>(`${this.baseUrl}/events/${eventTriggerId}/records`);
  }
}

// Export a singleton instance
export const monitorService = new MonitorService();

// Export default for flexibility
export default monitorService;