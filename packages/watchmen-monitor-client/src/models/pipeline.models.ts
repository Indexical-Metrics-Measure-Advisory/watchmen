// Pipeline Monitor (runtime) models — mirror watchmen-model pipeline_kernel.
// Source: packages/watchmen-model/.../pipeline_kernel/pipeline_monitor_log.py
// Endpoints: POST /pipeline/log, /pipeline/log/rerun/*, /topic/data/rerun (design doc §4.2)

import type { Pageable } from './api.models';

/** `MonitorLogStatus` enum. */
export enum MonitorLogStatus {
  DONE = 'DONE',
  IGNORED = 'IGNORED',
  ERROR = 'ERROR',
}

/** Shared status/timing fields on every monitor-log node. */
export interface StandardMonitorLog {
  status: MonitorLogStatus | null;
  startTime: string | null;
  spentInMills: number | null;
  error: string | null;
}

export interface ConditionalMonitorLog extends StandardMonitorLog {
  prerequisite: boolean | null;
  prerequisiteDefinedAs?: any;
}

/** Action-level execution record. `type` mirrors PipelineActionType. */
export interface MonitorLogAction extends StandardMonitorLog {
  uid: string;
  actionId: string;
  type: string;
  insertCount?: number;
  updateCount?: number;
  deleteCount?: number;
  definedAs?: any;
  touched?: any;
  findBy?: any;
}

export interface MonitorLogUnit extends ConditionalMonitorLog {
  unitId: string;
  name: string;
  loopVariableName?: string | null;
  loopVariableValue?: any;
  actions: MonitorLogAction[];
}

export interface MonitorLogStage extends ConditionalMonitorLog {
  stageId?: string;
  name?: string;
  units?: MonitorLogUnit[];
}

/** Top-level pipeline monitor log — nested execution trace. */
export interface PipelineMonitorLog extends ConditionalMonitorLog {
  uid?: string;
  traceId?: string;
  pipelineId?: string;
  topicId?: string;
  dataId?: string | number;
  oldValue?: any;
  newValue?: any;
  stages?: MonitorLogStage[];
}

/** Query criteria for POST /pipeline/log. */
export interface PipelineMonitorLogCriteria extends Pageable {
  topicId?: string | null;
  pipelineId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: MonitorLogStatus | null;
  traceId?: string | null;
  tenantId?: string | null;
}

/** Paginated monitor-log response. */
export interface PipelineMonitorLogDataPage {
  data: PipelineMonitorLog[];
  itemCount?: number;
  pageCount?: number;
  pageNumber?: number;
  pageSize?: number;
}

/** Result of a (re)run trigger. */
export interface PipelineTriggerResult {
  received?: boolean;
  traceId?: string;
  internalDataId?: string;
  logId?: string;
}

/** Batch error-rerun payload (PipelineMonitorResult). */
export interface PipelineMonitorResult {
  errorCount?: number;
  errorSummary?: any;
  errorDetails: any[];
}
