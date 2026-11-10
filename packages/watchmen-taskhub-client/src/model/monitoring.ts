import type { RunStatus } from './run';

export type Readiness = 'FRESH' | 'STALE' | 'FAILED' | 'UNKNOWN';

export interface Asset {
  id: string;
  name: string;
  type: 'topic' | 'metric' | 'source_table';
  description: string;
  readiness: Readiness;
  late?: boolean;
  builderTaskIds: string[];
  upstreamAssetIds: string[];
  downstreamAssetIds: string[];
  lastBuiltAt?: string;
  rowCount?: number;
  owner: string;
}

export interface AlertEvent {
  id: string;
  type: string;
  title: string;
  taskId?: string;
  detail: string;
  createdAt: string;
  level: 'critical' | 'warning' | 'info';
  status: 'SENT' | 'PENDING' | 'FAILED';
}

export interface AdapterHealth {
  id: string;
  name: string;
  engine: string;
  state: 'HEALTHY' | 'UNSYNCED';
  lagSeconds: number;
  lastSyncAt: string;
  taskCount: number;
}

export interface SuccessTrendPoint {
  day: string;
  rate: number;
  runs: number;
}

export interface TimelineRow {
  taskId: string;
  start: number;
  duration: number;
  actualStart: number;
  actualDuration: number;
  status: RunStatus;
  label: string;
  risk?: boolean;
}
