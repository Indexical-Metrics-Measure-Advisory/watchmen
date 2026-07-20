// Pipeline Monitor (runtime) service — wraps /pipeline/log and rerun endpoints.
// Source router: packages/watchmen-pipeline-surface/.../data/{monitor_log_router,topic_trigger_router}.py
import { API_BASE_URL, getDefaultHeaders, checkResponse, omitNil } from '@/utils/apiConfig';
import type {
  PipelineMonitorLogCriteria,
  PipelineMonitorLogDataPage,
  PipelineTriggerResult,
  PipelineMonitorResult,
} from '@/models/pipeline.models';

/** Criteria for POST /pipeline/log/stats (non-paginated; sampleSize caps the duration/write sample). */
export interface PipelineLogStatsCriteria {
  topicId?: string;
  pipelineId?: string;
  startDate?: string;
  endDate?: string;
  tenantId?: string;
  sampleSize?: number;
}

/** Aggregated pipeline-run stats returned by POST /pipeline/log/stats. */
export interface PipelineLogStats {
  total: number;
  byStatus: Record<string, number>;
  avgDurationMs?: number | null;
  p95DurationMs?: number | null;
  insertCount: number;
  updateCount: number;
  deleteCount: number;
  sampleSize: number;
}

class PipelineMonitorService {
  /** POST /pipeline/log — paginated monitor logs. */
  async getLogs(criteria: PipelineMonitorLogCriteria): Promise<PipelineMonitorLogDataPage> {
    // Strip null/empty fields so unused criteria are absent (not JSON null) in the body —
    // Pydantic rejects explicit null on these str/enum fields.
    const payload = omitNil(criteria);
    const res = await fetch(`${API_BASE_URL}/pipeline/log`, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify(payload),
    });
    return checkResponse(res);
  }

  /** GET /pipeline/log/rerun/uid — rerun a single monitor log by uid. */
  async rerunByUid(uid: string): Promise<PipelineTriggerResult> {
    const url = `${API_BASE_URL}/pipeline/log/rerun/uid?uid=${encodeURIComponent(uid)}`;
    const res = await fetch(url, { method: 'GET', headers: getDefaultHeaders() });
    return checkResponse(res);
  }

  /** GET /topic/data/rerun — rerun a single data row on a topic/pipeline. */
  async rerunDataRow(params: {
    topicId?: string;
    topicName?: string;
    dataId: string | number;
    pipelineId?: string;
    tenantId?: string;
  }): Promise<PipelineTriggerResult> {
    const qs = new URLSearchParams();
    if (params.topicId) qs.set('topic_id', String(params.topicId));
    if (params.topicName) qs.set('topic_name', params.topicName);
    qs.set('data_id', String(params.dataId));
    if (params.pipelineId) qs.set('pipeline_id', params.pipelineId);
    if (params.tenantId) qs.set('tenant_id', params.tenantId);
    const res = await fetch(`${API_BASE_URL}/topic/data/rerun?${qs.toString()}`, {
      method: 'GET',
      headers: getDefaultHeaders(),
    });
    return checkResponse(res);
  }

  /** POST /pipeline/log/rerun/error — batch rerun errors (max 2000 errorDetails). */
  async rerunErrors(payload: PipelineMonitorResult): Promise<PipelineTriggerResult[]> {
    const res = await fetch(`${API_BASE_URL}/pipeline/log/rerun/error`, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify(payload),
    });
    return checkResponse(res);
  }

  /** POST /pipeline/log/stats — aggregated stats (counts by status, avg/p95 duration, write counts). */
  async getLogStats(criteria: PipelineLogStatsCriteria = {}): Promise<PipelineLogStats> {
    const res = await fetch(`${API_BASE_URL}/pipeline/log/stats`, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify(omitNil(criteria)),
    });
    return checkResponse(res);
  }
}

export const pipelineMonitorService = new PipelineMonitorService();
export default pipelineMonitorService;
