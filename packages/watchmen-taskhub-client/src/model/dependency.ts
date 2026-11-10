export type DependencyStatus = 'PROPOSED' | 'ACCEPTED' | 'REJECTED';

export interface TaskDependency {
  id: string;
  upstreamTaskId: string;
  downstreamTaskId: string;
  kind: 'explicit' | 'inferred_data';
  status: DependencyStatus;
  enabled: boolean;
  condition: 'ON_SUCCESS' | 'ON_FINISH' | 'ON_FAILURE';
  instancePolicy: 'LATEST_RUN' | 'SAME_WINDOW';
  offsetDays: number;
}

export type NewDependencyInput = Pick<TaskDependency, 'upstreamTaskId' | 'downstreamTaskId' | 'condition' | 'instancePolicy'>;
