import { API_BASE_URL, getDefaultHeaders, checkResponse } from '@/utils/apiConfig';
import { PaginatedEventsResponse, EventResultRecord } from '@/models/monitor.models';

// Trigger mode types matching API documentation
export type TriggerMode = 'default' | 'by_table' | 'by_record';

// Request: POST /collector/trigger/event (Full Sync)
export interface TriggerEventRequest {
  startTime: string;
  endTime: string;
}

// Request: POST /collector/trigger/event/table
export interface TriggerEventByTableRequest extends TriggerEventRequest {
  modelId?: string;
  tableName: string;
}

// Request: POST /collector/trigger/event/record
export interface TriggerEventByRecordRequest {
  tableName: string;
  records: Record<string, any>[];
}

// Monitor events (paginated) request payload
export interface MonitorEventsRequest {
  pageNumber: number;
  pageSize: number;
}

class CollectorService {
  // POST /collector/trigger/event — Full Sync (type=1)
  async triggerEvent(payload: TriggerEventRequest): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/collector/trigger/event`, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify(payload),
    });
    return checkResponse(response);
  }

  // POST /collector/trigger/event/table — By Table (type=2)
  async triggerEventByTable(payload: TriggerEventByTableRequest): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/collector/trigger/event/table`, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify(payload),
    });
    return checkResponse(response);
  }

  // POST /collector/trigger/event/record — By Record (type=3)
  async triggerEventByRecord(payload: TriggerEventByRecordRequest): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/collector/trigger/event/record`, {
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
    const response = await fetch(`${API_BASE_URL}/ingest/monitor/event/detail?trigger_event_id=${encodeURIComponent(eventTriggerId)}`, {
      method: 'GET',
      headers: getDefaultHeaders()
    });
    return checkResponse(response);
  }
}

export const collectorService = new CollectorService();
export default collectorService;
