export interface SemanticModelEntity {
  name: string;
  description?: string | null;
  type: 'primary' | 'foreign';
  role?: string | null;
  expr: string;
  metadata?: unknown;
  label?: string | null;
}

export interface SemanticModelMeasure {
  name: string;
  agg: 'count' | 'sum' | 'average' | 'count_distinct' | 'min' | 'max';
  description?: string;
  create_metric?: boolean;
  expr: string;
  agg_params?: unknown;
  metadata?: unknown;
  non_additive_dimension?: unknown;
  agg_time_dimension?: unknown;
  label?: string | null;
}

export interface SemanticModelDimension {
  name: string;
  description?: string | null;
  type: 'time' | 'categorical';
  is_partition?: boolean;
  type_params?: {
    time_granularity?: string;
    validity_params?: unknown;
  };
  expr: string;
  metadata?: unknown;
  label?: string | null;
}

export interface SemanticModelNodeRelation {
  alias: string;
  schema_name: string;
  database: string;
  relation_name: string;
  // Connection details
  databaseType?: 'pgsql' | 'snowflake' | 'oracle' | 'mysql' | 'mssql';
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  // Snowflake specific
  account?: string;
  warehouse?: string;
  role?: string;
}

export interface SemanticModelDefaults {
  agg_time_dimension: string;
}

export interface SemanticModel {
  id: string;
  name: string;
  defaults: SemanticModelDefaults;
  description: string;
  node_relation: SemanticModelNodeRelation;
  primary_entity?: string | null;
  entities: SemanticModelEntity[];
  measures: SemanticModelMeasure[];
  dimensions: SemanticModelDimension[];
  label?: string | null;
  metadata?: unknown;
  config?: {
    meta?: unknown;
  };
  topicId?: string;
  sourceType?: 'topic' | 'subject' | 'db_source';
}

export interface SemanticModelSummary {
  totalModels: number;
  totalEntities: number;
  totalMeasures: number;
  lastUpdated: string;
}