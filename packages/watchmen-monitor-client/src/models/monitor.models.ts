// Ingest Monitor models — mirror watchmen-collector-kernel domain models.
// Source: packages/watchmen-collector-kernel/.../model/{trigger_event,monitor,status,scheduled_task}.py
// Endpoints: /ingest/monitor/* (see docs/data-monitor-frontend-design.md §4.1)

/** `EventType` enum — TriggerEvent.type. */
export enum EventType {
  DEFAULT = 1,
  BY_TABLE = 2,
  BY_RECORD = 3,
  BY_PIPELINE = 4,
  BY_SCHEDULE = 5,
}

/** `Status` enum — TriggerEvent.status / EventResultRecord.status. */
export enum IngestStatus {
  INITIAL = 0,
  EXECUTING = 1,
  SUCCESS = 2,
  FAIL = 3,
  WAITING = 4,
}

/** `TaskType` enum — ScheduledTask.type. */
export enum TaskType {
  DEFAULT = 1,
  RUN_PIPELINE = 2,
  GROUP = 3,
}

/** ScheduledTask `Result` enum. */
export enum TaskResult {
  DEPENDENCY_FAILED = 'DEPENDENCY_FAILED',
  PROCESS_TASK_SUCCESS = 'PROCESS_TASK_SUCCESS',
  PROCESS_TASK_FAILED = 'PROCESS_TASK_FAILED',
}

/** Top-level ingestion trigger event (TriggerEvent). */
export interface EventTriggerItem {
  eventTriggerId: string;
  startTime: string | null;
  endTime: string | null;
  isFinished: boolean;
  status: number; // IngestStatus
  type: number; // EventType
  tableName: string;
  records: Array<Record<string, any>> | null;
  pipelineId: string | null;
  params: any | null;
  result?: Record<string, any> | null;
  createdAt: string;
  createdBy: string;
  lastModifiedAt: string;
  lastModifiedBy: string;
  tenantId: string;
}

/** Paginated event list envelope returned by POST /ingest/monitor/event. */
export interface PaginatedEventsResponse {
  pageNumber: number;
  pageSize: number;
  data: EventTriggerItem[];
  itemCount?: number;
  pageCount?: number;
  total?: number;
  totalPages?: number;
}

/** Per-table aggregated result (EventResultRecord) from GET /ingest/monitor/event/detail. */
export interface EventResultRecord {
  eventTriggerId?: string;
  moduleTriggerId?: string;
  modelTriggerId?: string;
  tableTriggerId?: string;
  moduleName?: string;
  modelName?: string;
  tableName?: string;
  startTime?: string;
  dataCount?: number;
  jsonCount?: number;
  jsonFinishedCount?: number;
  status?: number; // IngestStatus
  percent?: number;
  errors?: number;
}

/** Module/Model/Table drilldown rows (the lightweight hierarchy models). */
export interface TriggerModule {
  moduleTriggerId: string;
  moduleName: string;
  isFinished: boolean;
  priority: number;
  eventTriggerId: string;
}

export interface TriggerModel {
  modelTriggerId: string;
  modelName: string;
  isFinished: boolean;
  priority: number;
  moduleTriggerId: string;
  eventTriggerId: string;
}

export interface TriggerTable {
  tableTriggerId: string;
  tableName: string;
  dataCount: number;
  modelName: string;
  isExtracted: boolean;
  result?: Record<string, any> | null;
  modelTriggerId: string;
  moduleTriggerId: string;
  eventTriggerId: string;
}

/** Unfinished/finished count pair returned by /ingest/monitor/{record,json,task}. */
export interface ProgressCounts {
  unfinished: number;
  finished: number;
}

/** Scheduled task (lightweight) for the Tasks sub-tab. */
export interface ScheduledTask {
  taskId: string;
  resourceId: string;
  topicCode: string;
  modelName?: string;
  objectId?: string;
  dependOn?: string[];
  parentTaskId?: string;
  isFinished: boolean;
  status?: number;
  result?: TaskResult;
  type: TaskType;
  pipelineId?: string;
  eventTriggerId: string;
}
