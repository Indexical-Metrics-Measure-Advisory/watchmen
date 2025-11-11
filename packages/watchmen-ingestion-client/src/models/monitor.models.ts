// Monitoring data models

export interface IngestionEvent {
  id: string;
  module: string;
  model: string;
  table: string;
  status: 'success' | 'failed' | 'running' | 'warning';
  recordsProcessed: number;
  startTime: string;
  endTime: string | null;
  duration: string;
  errors: number;
  warnings: number;
}

export interface MonitoringSummary {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  runningEvents: number;
  warningEvents: number;
  successRate: number;
}

// Paginated event trigger item (first-level list)
export interface EventTriggerItem {
  eventTriggerId: string;
  startTime: string | null;
  endTime: string | null;
  isFinished: boolean;
  status: number;
  type: number;
  tableName: string;
  records: Array<Record<string, any>> | null;
  pipelineId: string | null;
  params: any | null;
  createdAt: string;
  createdBy: string;
  lastModifiedAt: string;
  lastModifiedBy: string;
  tenantId: string;
}

// Paginated events response envelope
export interface PaginatedEventsResponse {
  pageNumber: number;
  pageSize: number;
  data: EventTriggerItem[];
  total?: number;
  totalPages?: number;
}

// Event result record (second-level list)
export interface EventResultRecord {
  eventTriggerId?: string;
  moduleTriggerId?: string;
  modelTriggerId?: string;
  tableTriggerId?: string;
  moduleName?: string;
  modelName?: string;
  tableName?: string;
  startTime?: string; // formatted string for display
  dataCount?: number;
  jsonCount?: number;
  jsonFinishedCount?: number;
  status?: number;
  percent?: number;
  errors?: number;
}