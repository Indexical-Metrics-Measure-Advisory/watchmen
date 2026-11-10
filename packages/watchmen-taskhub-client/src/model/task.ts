export type TaskType =
  | 'collector_online'
  | 'collector_batch'
  | 'materialization'
  | 'materialization_flow'
  | 'pipeline_event'
  | 'pipeline_snapshot'
  | 'dqc_job'
  | 'custom';

export type ScheduleFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'INTERVAL' | 'CRON' | 'EVENT' | 'STREAMING';

export interface ScheduleDefinition {
  mode: 'mirrored' | 'managed';
  frequency: ScheduleFrequency;
  timeOfDay?: string;
  intervalMinutes?: number;
  cronExpression?: string;
  weekday?: number;
  dayOfMonth?: number;
  timezone: string;
  misfirePolicy: 'catchup_window' | 'skip' | 'fire_once';
  graceMinutes: number;
  dependencyWaitTimeoutMinutes: number;
  freshnessSlaMinutes?: number;
}

export interface ResourceRef {
  id: string;
  type: 'topic' | 'metric' | 'source_table' | 'pipeline' | 'data_source';
  name: string;
  role: 'SOURCE' | 'TARGET';
  inferred: boolean;
}

export interface ExternalTriggerConfig {
  enabled: boolean;
}

export interface TaskCallbackConfig {
  enabled: boolean;
  url: string;
  events: import('./run').RunStatus[];
  timeoutSeconds: number;
}

export interface TaskIntegrationInput {
  externalTrigger: ExternalTriggerConfig;
  callback: TaskCallbackConfig;
}

export type TaskTargetKind = 'collector_module' | 'collector_model' | 'collector_table' | 'pipeline' |
  'materialization' | 'materialization_flow' | 'topic_snapshot_scheduler' | 'dqc_monitor_rule' | 'custom_entity';

export interface TaskTargetOption {
  id: string;
  name: string;
  kind: TaskTargetKind;
  description?: string;
}

export interface TaskDefinition extends TaskIntegrationInput {
  id: string;
  name: string;
  description: string;
  type: TaskType;
  executionMode: 'STREAMING' | 'SCHEDULED' | 'MANUAL' | 'EVENT';
  engine: string;
  engineRef: string;
  targetKind?: TaskTargetKind;
  targetName?: string;
  schedule: ScheduleDefinition;
  enabled: boolean;
  owner: string;
  tags: string[];
  lastStatus: import('./run').RunStatus;
  lastRunAt?: string;
  successRate?: number;
  avgDurationMs?: number;
  refs: ResourceRef[];
  readOnly?: boolean;
  projectionUnsupported?: boolean;
}

export interface NewTaskInput extends TaskIntegrationInput {
  name: string;
  description: string;
  owner: string;
  type: TaskType;
  engine: string;
  engineRef: string;
  targetKind: TaskTargetKind;
  targetName: string;
  schedule: ScheduleDefinition;
}
