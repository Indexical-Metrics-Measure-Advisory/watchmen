// Monitor UI constants — enum → label / Tailwind color class mappings.
// Aligns with the design language in docs/data-monitor-frontend-design.md §2.1 and Appendix A.
import { IngestStatus, EventType, TaskResult } from '@/models/monitor.models';
import { MonitorLogStatus } from '@/models/pipeline.models';
import { PipelineTriggerType } from '@/models/pipelineMeta.models';
import { TopicType, TopicKind } from '@/models/topic.models';

/** A unified visual "tone" for status/severity across the console. */
export type Tone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export const TONE_DOT_CLASS: Record<Tone, string> = {
  success: 'bg-green-500',
  warning: 'bg-orange-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  neutral: 'bg-slate-400',
};

export const TONE_PILL_CLASS: Record<Tone, string> = {
  success: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-orange-50 text-orange-700 border-orange-200',
  error: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  neutral: 'bg-slate-50 text-slate-600 border-slate-200',
};

// ---- Ingest Status (TriggerEvent.status / EventResultRecord.status) ----
export const INGEST_STATUS_META: Record<number, { label: string; tone: Tone }> = {
  [IngestStatus.INITIAL]: { label: 'INITIAL', tone: 'neutral' },
  [IngestStatus.EXECUTING]: { label: 'EXECUTING', tone: 'info' },
  [IngestStatus.SUCCESS]: { label: 'SUCCESS', tone: 'success' },
  [IngestStatus.FAIL]: { label: 'FAIL', tone: 'error' },
  [IngestStatus.WAITING]: { label: 'WAITING', tone: 'warning' },
};

export const getIngestStatusMeta = (status?: number) =>
  (status != null && INGEST_STATUS_META[status]) || { label: 'UNKNOWN', tone: 'neutral' as Tone };

// ---- EventType ----
export const EVENT_TYPE_META: Record<number, { label: string }> = {
  [EventType.DEFAULT]: { label: 'DEFAULT' },
  [EventType.BY_TABLE]: { label: 'BY_TABLE' },
  [EventType.BY_RECORD]: { label: 'BY_RECORD' },
  [EventType.BY_PIPELINE]: { label: 'BY_PIPELINE' },
  [EventType.BY_SCHEDULE]: { label: 'BY_SCHEDULE' },
};

export const getEventTypeLabel = (type?: number) =>
  (type != null && EVENT_TYPE_META[type]?.label) || 'UNKNOWN';

// ---- Scheduled task result ----
export const TASK_RESULT_META: Record<TaskResult, { label: string; tone: Tone }> = {
  [TaskResult.DEPENDENCY_FAILED]: { label: 'DEPENDENCY_FAILED', tone: 'warning' },
  [TaskResult.PROCESS_TASK_SUCCESS]: { label: 'PROCESS_TASK_SUCCESS', tone: 'success' },
  [TaskResult.PROCESS_TASK_FAILED]: { label: 'PROCESS_TASK_FAILED', tone: 'error' },
};

// ---- Pipeline MonitorLogStatus ----
export const PIPELINE_LOG_STATUS_META: Record<MonitorLogStatus, { label: string; tone: Tone }> = {
  [MonitorLogStatus.DONE]: { label: 'DONE', tone: 'success' },
  [MonitorLogStatus.IGNORED]: { label: 'IGNORED', tone: 'warning' },
  [MonitorLogStatus.ERROR]: { label: 'ERROR', tone: 'error' },
};

export const getPipelineLogStatusMeta = (status?: MonitorLogStatus | string | null) => {
  if (!status) return { label: '—', tone: 'neutral' as Tone };
  return PIPELINE_LOG_STATUS_META[status as MonitorLogStatus] || { label: String(status), tone: 'neutral' as Tone };
};

// ---- PipelineTriggerType ----
export const PIPELINE_TRIGGER_TYPE_LABEL: Record<PipelineTriggerType, string> = {
  [PipelineTriggerType.INSERT]: 'INSERT',
  [PipelineTriggerType.MERGE]: 'MERGE',
  [PipelineTriggerType.INSERT_OR_MERGE]: 'INSERT_OR_MERGE',
  [PipelineTriggerType.DELETE]: 'DELETE',
};

// ---- Data source health probe status ----
export type DataSourceHealthStatus = 'ok' | 'error' | 'skipped' | 'timeout';

export const DATA_SOURCE_HEALTH_META: Record<DataSourceHealthStatus, { tone: Tone }> = {
  ok: { tone: 'success' },
  error: { tone: 'error' },
  skipped: { tone: 'neutral' },
  timeout: { tone: 'warning' },
};

export const getDataSourceHealthMeta = (status?: DataSourceHealthStatus | string | null) => {
  if (!status) return { tone: 'neutral' as Tone };
  return DATA_SOURCE_HEALTH_META[status as DataSourceHealthStatus] || { tone: 'neutral' as Tone };
};

// ---- Topic type / kind ----
export const TOPIC_TYPE_LABEL: Record<TopicType, string> = {
  [TopicType.RAW]: 'RAW',
  [TopicType.META]: 'META',
  [TopicType.DISTINCT]: 'DISTINCT',
  [TopicType.AGGREGATE]: 'AGGREGATE',
  [TopicType.TIME]: 'TIME',
  [TopicType.RATIO]: 'RATIO',
};

export const TOPIC_KIND_LABEL: Record<TopicKind, string> = {
  [TopicKind.SYSTEM]: 'SYSTEM',
  [TopicKind.BUSINESS]: 'BUSINESS',
  [TopicKind.SYNONYM]: 'SYNONYM',
};

/** Format a millisecond duration as e.g. "1.23s" / "456ms". */
export const formatDuration = (ms?: number | null): string => {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

/** Format a percent (0–100, or 0–1) consistently. */
export const formatPercent = (percent?: number | null): string => {
  if (percent == null) return '—';
  const value = percent <= 1 ? percent * 100 : percent;
  return `${value.toFixed(1)}%`;
};
