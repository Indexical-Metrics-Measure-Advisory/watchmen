export interface SemanticModelEntity {
  name: string;
  description?: string | null;
  type: 'primary' | 'foreign';
  role?: string | null;
  expr: string;
  metadata?: any;
  label?: string | null;
}

export interface SemanticModelMeasure {
  name: string;
  agg: 'count' | 'sum' | 'average' | 'count_distinct';
  description?: string;
  create_metric?: boolean;
  expr: string;
  agg_params?: any;
  metadata?: any;
  non_additive_dimension?: any;
  agg_time_dimension?: any;
  label?: string | null;
}

export interface SemanticModelDimension {
  name: string;
  description?: string | null;
  type: 'time' | 'categorical';
  is_partition?: boolean;
  type_params?: {
    time_granularity?: string;
    validity_params?: any;
  };
  expr: string;
  metadata?: any;
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
  metadata?: any;
  config?: {
    meta?: any;
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