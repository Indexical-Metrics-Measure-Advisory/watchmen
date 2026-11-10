import type { ClusterOverview } from './cluster';
import type { TaskDependency } from './dependency';
import type { AdapterHealth, AlertEvent, Asset, SuccessTrendPoint, TimelineRow } from './monitoring';
import type { TaskRun } from './run';
import type { TaskDefinition } from './task';

export interface TaskHubSnapshot {
  tasks: TaskDefinition[];
  runs: TaskRun[];
  dependencies: TaskDependency[];
  assets: Asset[];
  alerts: AlertEvent[];
  adapters: AdapterHealth[];
  successTrend: SuccessTrendPoint[];
  timeline: TimelineRow[];
  cluster: ClusterOverview;
}
