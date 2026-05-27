export type LineageStage = 'metric' | 'semantic' | 'topic' | 'pipeline' | 'source';

export type LineageNodeType =
  | 'metric'
  | 'metric_ref'
  | 'semantic_model'
  | 'semantic_measure'
  | 'topic'
  | 'topic_factor'
  | 'pipeline'
  | 'source_table'
  | 'source_field';

export interface LineageNode {
  id: string;
  stage: LineageStage;
  type: LineageNodeType;
  name: string;
  label?: string;
  description?: string;
  badge?: string;
  metadata?: Record<string, unknown>;
}

export interface LineageEdge {
  id: string;
  from: string;
  to: string;
  kind: 'defines' | 'maps_to' | 'reads_from' | 'derived_from' | 'produces';
  pathId: string;
}

export interface LineagePath {
  id: string;
  title: string;
  nodeIds: string[];
  isPrimary?: boolean;
}

export interface LineageRoute {
  id: string;
  title: string;
  nodeIds: string[];
  hopDepth: number;
  reachesSource: boolean;
  reachesRawTopic: boolean;
  isPrimary?: boolean;
}

export interface LineageGroup {
  id: string;
  stage: LineageStage;
  title: string;
  totalNodes: number;
  activeNodes: number;
  collapsedNodeCount: number;
  previewNodeIds: string[];
}

export interface LineageRoot {
  nodeId: string;
  label: string;
  nodeType: 'topic' | 'source_table' | 'source_field';
  routeIds: string[];
  hopDepth: number;
}

export interface MetricLineageViewData {
  metricName: string;
  status: 'resolved' | 'partial' | 'unresolved';
  summary: {
    metricType: string;
    semanticModelCount: number;
    topicCount: number;
    pipelineCount: number;
    sourceFieldCount: number;
    sourceTableCount?: number;
    routeCount?: number;
    maxHopDepth?: number;
    rawTopicCount?: number;
  };
  nodes: LineageNode[];
  edges: LineageEdge[];
  paths: LineagePath[];
  routes?: LineageRoute[];
  groups?: LineageGroup[];
  roots?: LineageRoot[];
  diagnostics?: string[];
}
