export type RunStatus = 'PENDING' | 'WAITING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'SKIPPED' | 'STALE';

export interface RunDependency {
  dependencyId: string;
  taskId: string;
  taskName: string;
  runId?: string;
  state: 'WAITING' | 'SATISFIED' | 'VIOLATED';
  condition: string;
}

export interface TaskRun {
  id: string;
  taskId: string;
  instanceKey: string;
  attempt: number;
  processDate: string;
  status: RunStatus;
  triggerType: 'SCHEDULE' | 'MANUAL' | 'API' | 'DEPENDENCY';
  window: string;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  rowCount?: number;
  triggeredBy: string;
  engineRunKey: string;
  claimedBy?: string;
  lockExpiresAt?: string;
  idempotencyKey?: string;
  error?: string;
  dependencies: RunDependency[];
}

export interface RunTaskInput {
  processDate: string;
  params?: Record<string, unknown>;
  bypassDependencies?: boolean;
}
