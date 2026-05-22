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

export interface MetricLineageViewData {
  metricName: string;
  status: 'resolved' | 'partial' | 'unresolved';
  summary: {
    metricType: string;
    semanticModelCount: number;
    topicCount: number;
    pipelineCount: number;
    sourceFieldCount: number;
  };
  nodes: LineageNode[];
  edges: LineageEdge[];
  paths: LineagePath[];
  diagnostics?: string[];
}
