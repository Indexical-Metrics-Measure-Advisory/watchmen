import { API_BASE_URL, getDefaultHeaders, checkResponse } from '@/utils/apiConfig';
import { PaginatedEventsResponse, EventResultRecord } from '@/models/monitor.models';

export interface TriggerEventRequest {
  startTime: string; // ISO datetime string
  endTime: string;   // ISO datetime string
  modelId: string;
  tableName: string;
}

// Monitor events (paginated) request payload
export interface MonitorEventsRequest {
  pageNumber: number;
  pageSize: number;
}

class CollectorService {
  async triggerEventByTable(payload: TriggerEventRequest): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/collector/trigger/event/table`, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify(payload),
    });
    return checkResponse(response);
  }

  // Fetch paginated monitor events list
  async getMonitorEvents(params: MonitorEventsRequest): Promise<PaginatedEventsResponse> {
    const response = await fetch(`${API_BASE_URL}/ingest/monitor/event`, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify(params),
    });
    return checkResponse(response);
  }

  // Fetch detailed event result records by eventTriggerId
  async getMonitorEventRecords(eventTriggerId: string): Promise<EventResultRecord[]> {
    const response = await fetch(`${API_BASE_URL}/ingest/monitor/event/detail?trigger_event_id=${encodeURIComponent(eventTriggerId)}` , {
      method: 'GET',
      headers: getDefaultHeaders()
  
    });
    return checkResponse(response);
  }
}

export const collectorService = new CollectorService();
export default collectorService;