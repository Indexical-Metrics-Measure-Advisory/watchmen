import type { RunStatus, ScheduleDefinition, TaskType } from '@/model';

export interface DataPage<T> {
  data?: T[];
}

export interface TaskDefinitionDto {
  taskId: string;
  name: string;
  description?: string;
  taskType: TaskType;
  executionMode: 'STREAMING' | 'SCHEDULED' | 'MANUAL' | 'EVENT';
  engineRef: { kind: string; id: string };
  schedule?: ScheduleDefinition;
  externalTrigger?: { enabled: boolean };
  callback?: { enabled: boolean; url?: string; events: RunStatus[]; timeoutSeconds: number };
  enabled: boolean;
  ownerId?: string;
  ownerName?: string;
  tags?: string[];
  lastRunSummary?: {
    status?: RunStatus;
    lastRunAt?: string;
    successRate?: number;
    avgDurationMs?: number;
  };
  capabilities?: { run?: boolean; projection?: boolean };
  refs?: Array<{ refId: string; refType: string; targetId: string; targetName?: string; role: 'SOURCE' | 'TARGET'; inferred: boolean }>;
}

export interface TaskRunDto {
  runId: string;
  taskId: string;
  instanceKey: string;
  attempt: number;
  processDate: string;
  status: RunStatus;
  triggerType: 'SCHEDULE' | 'MANUAL' | 'API' | 'DEPENDENCY';
  windowStart?: string;
  windowEnd?: string;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  rowCount?: number;
  triggeredBy?: string;
  engineRunKey: string;
  claimedBy?: string;
  lockExpiresAt?: string;
  idempotencyKey?: string;
  errorMessage?: string;
  dependencies?: Array<{
    dependencyId: string;
    upstreamTaskId: string;
    upstreamTaskName: string;
    upstreamRunId?: string;
    state: 'WAITING' | 'SATISFIED' | 'VIOLATED';
    condition: string;
  }>;
}

export interface TaskDependencyDto {
  dependencyId: string;
  upstreamTaskId: string;
  downstreamTaskId: string;
  kind: 'explicit' | 'inferred_data';
  adoptionStatus: 'PROPOSED' | 'ACCEPTED' | 'REJECTED';
  enabled: boolean;
  condition: 'ON_SUCCESS' | 'ON_FINISH' | 'ON_FAILURE';
  instancePolicy: 'LATEST_RUN' | 'SAME_WINDOW';
  offsetDays: number;
}
