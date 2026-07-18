// Ingest Monitor service — wraps /ingest/monitor/* and /ingest/query/event.
// Source router: packages/watchmen-rest-doll/.../ingest/monitor_router.py
// All calls use the shared fetch + getDefaultHeaders + bigint-safe checkResponse.
import { API_BASE_URL, getDefaultHeaders, checkResponse } from '@/utils/apiConfig';
import type { Pageable, DataPage } from '@/models/api.models';
import type {
  EventTriggerItem,
  PaginatedEventsResponse,
  EventResultRecord,
  TriggerModule,
  TriggerModel,
  TriggerTable,
  ProgressCounts,
} from '@/models/monitor.models';

class IngestMonitorService {
  /** GET /ingest/query/event — single event lookup. */
  async getEvent(eventTriggerId: string | number): Promise<EventTriggerItem> {
    const url = `${API_BASE_URL}/ingest/query/event?event_trigger_id=${encodeURIComponent(eventTriggerId)}`;
    const res = await fetch(url, { method: 'GET', headers: getDefaultHeaders() });
    return checkResponse(res);
  }

  /** POST /ingest/monitor/event — paginated trigger-event list (sorted by id DESC). */
  async getEvents(pageable: Pageable): Promise<PaginatedEventsResponse> {
    const res = await fetch(`${API_BASE_URL}/ingest/monitor/event`, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify(pageable),
    });
    return checkResponse(res);
  }

  /** POST /ingest/monitor/module — module drilldown for an event. */
  async getModules(eventTriggerId: string | number, pageable: Pageable): Promise<DataPage<TriggerModule>> {
    const url = `${API_BASE_URL}/ingest/monitor/module?trigger_event_id=${encodeURIComponent(eventTriggerId)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify(pageable),
    });
    return checkResponse(res);
  }

  /** POST /ingest/monitor/model — model drilldown. */
  async getModels(eventTriggerId: string | number, pageable: Pageable): Promise<DataPage<TriggerModel>> {
    const url = `${API_BASE_URL}/ingest/monitor/model?trigger_event_id=${encodeURIComponent(eventTriggerId)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify(pageable),
    });
    return checkResponse(res);
  }

  /** POST /ingest/monitor/table — table drilldown. */
  async getTables(eventTriggerId: string | number, pageable: Pageable): Promise<DataPage<TriggerTable>> {
    const url = `${API_BASE_URL}/ingest/monitor/table?trigger_event_id=${encodeURIComponent(eventTriggerId)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify(pageable),
    });
    return checkResponse(res);
  }

  /** POST /ingest/monitor/record — change-data record counts. */
  async getRecordCounts(eventTriggerId: string | number): Promise<ProgressCounts> {
    const url = `${API_BASE_URL}/ingest/monitor/record?trigger_event_id=${encodeURIComponent(eventTriggerId)}`;
    const res = await fetch(url, { method: 'POST', headers: getDefaultHeaders() });
    return checkResponse(res);
  }

  /** POST /ingest/monitor/json — change-data JSON counts. */
  async getJsonCounts(eventTriggerId: string | number): Promise<ProgressCounts> {
    const url = `${API_BASE_URL}/ingest/monitor/json?trigger_event_id=${encodeURIComponent(eventTriggerId)}`;
    const res = await fetch(url, { method: 'POST', headers: getDefaultHeaders() });
    return checkResponse(res);
  }

  /** POST /ingest/monitor/task — scheduled task counts. */
  async getTaskCounts(eventTriggerId: string | number): Promise<ProgressCounts> {
    const url = `${API_BASE_URL}/ingest/monitor/task?trigger_event_id=${encodeURIComponent(eventTriggerId)}`;
    const res = await fetch(url, { method: 'POST', headers: getDefaultHeaders() });
    return checkResponse(res);
  }

  /** GET /ingest/monitor/event/detail — per-table aggregated EventResultRecord[]. */
  async getEventDetail(eventTriggerId: string | number): Promise<EventResultRecord[]> {
    const url = `${API_BASE_URL}/ingest/monitor/event/detail?trigger_event_id=${encodeURIComponent(eventTriggerId)}`;
    const res = await fetch(url, { method: 'GET', headers: getDefaultHeaders() });
    return checkResponse(res);
  }
}

export const ingestMonitorService = new IngestMonitorService();
export default ingestMonitorService;
