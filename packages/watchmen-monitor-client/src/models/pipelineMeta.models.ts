// Pipeline Meta (definition) models — mirror watchmen-model admin/pipeline.py + graphic.
// Source: packages/watchmen-model/.../admin/pipeline.py
// Endpoints: /pipeline, /pipeline/all, /pipeline/updated, /pipeline/graphics*, /pipeline/*yaml* (design doc §4.3)
// The Monitor console consumes these read-only (to resolve names, render the DAG, show enable/validate state).

/** `PipelineTriggerType` enum. */
export enum PipelineTriggerType {
  INSERT = 'insert',
  MERGE = 'merge',
  INSERT_OR_MERGE = 'insert-or-merge',
  DELETE = 'delete',
}

/** Aggregate arithmetic on read actions. */
export enum AggregateArithmetic {
  NONE = 'none',
  COUNT = 'count',
  SUM = 'sum',
  AVG = 'avg',
}

/** A condition/prerequisite joint (`on`). Kept opaque — structure varies. */
export type ParameterJoint = any;

export interface PipelineAction {
  actionId?: string;
  name?: string;
  type: string; // Read*/Write*/Delete*/System action type
  // read-specific
  topicId?: string;
  by?: any;
  arithmetic?: AggregateArithmetic;
  // write-specific
  insertCount?: number;
  updateCount?: number;
  deleteCount?: number;
  // common
  [key: string]: any;
}

export interface PipelineUnit {
  unitId?: string;
  name?: string;
  loopVariableName?: string | null;
  do?: PipelineAction[];
  on?: ParameterJoint;
}

export interface PipelineStage {
  stageId?: string;
  name?: string;
  units?: PipelineUnit[];
  on?: ParameterJoint;
}

export interface Pipeline {
  pipelineId?: string;
  topicId?: string;
  name?: string;
  type?: PipelineTriggerType;
  stages?: PipelineStage[];
  enabled?: boolean;
  validated?: boolean;
  on?: ParameterJoint;
  tenantId?: string;
  version?: number;
  lastModifiedAt?: string;
  lastModifiedBy?: string;
  createdAt?: string;
  createdBy?: string;
}

/** Pipeline DAG canvas layout (per-user). */
export interface PipelineGraphicNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: Record<string, any>;
}

export interface PipelineGraphicEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  [key: string]: any;
}

export interface PipelineGraphic {
  pipelineGraphId?: string;
  name?: string;
  nodes?: PipelineGraphicNode[];
  edges?: PipelineGraphicEdge[];
  userId?: string;
  tenantId?: string;
  createdAt?: string;
  lastModifiedAt?: string;
}
