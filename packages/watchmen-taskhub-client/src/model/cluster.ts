export interface TaskHubNode {
  id: string;
  address: string;
  status: 'HEALTHY' | 'SUSPECT' | 'OFFLINE';
  lastHeartbeatAt: string;
  activeRuns: number;
  claimedLocks: number;
}

export interface ClusterOverview {
  nodes: TaskHubNode[];
  sharedStoreStatus: 'CONNECTED' | 'UNAVAILABLE';
  schedulerHeartbeatAt?: string;
  activeLocks: number;
  rejectedDuplicateDispatches: number;
  failovers24h: number;
}
