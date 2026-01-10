import { strict } from "assert";

export interface OffsetWindow {
  count: number;
  granularity: string;
}

export interface MetricReference {
  name: string;
  filter?: any;
  alias: string;
  offset_window?: OffsetWindow;
  offset_to_grain?: string;
} 

export interface InputMeasure {
  name: string;
  filter?: any;
  alias?: string;
  join_to_timespine: boolean;
  fill_nulls_with?: number;
}

export interface MeasureReference {
  name: string;
  filter?: string;
  alias?: string;
  join_to_timespine: boolean;
  fill_nulls_with?: number;
}

export interface WindowParams {
  count?: number;
  granularity?: string;
  window_string?: string;
  is_standard_granularity?: boolean;
}

export enum TimeGranularity {
  NANOSECOND = "nanosecond",
  MICROSECOND = "microsecond",
  MILLISECOND = "millisecond",
  SECOND = "second",
  MINUTE = "minute",
  HOUR = "hour",
  DAY = "day",
  WEEK = "week",
  MONTH = "month",
  QUARTER = "quarter",
  YEAR = "year"
}

export interface ConstantPropertyInput {
  property?: string;
  value?: string;
}

export type ConversionCalculationType = string;

export interface ConversionTypeParams {
  base_measure?: InputMeasure;
  conversion_measure?: InputMeasure;
  base_metric?: MetricReference;
  conversion_metric?: MetricReference;
  entity?: string;
  calculation?: ConversionCalculationType;
  window?: WindowParams;
  constant_properties?: ConstantPropertyInput[];
}

export type PeriodAggregation = string;

export interface CumulativeTypeParams {
  window?: WindowParams;
  grain_to_date?: TimeGranularity;
  period_agg?: PeriodAggregation;
  metric?: MetricReference;
}

export interface MetricTypeParams {
  measure?: MeasureReference;
  numerator?: InputMeasure;
  denominator?: InputMeasure;
  expr?: string;
  window?: WindowParams;
  grain_to_date?: TimeGranularity;
  metrics?: MetricReference[];
  conversion_type_params?: ConversionTypeParams;
  cumulative_type_params?: CumulativeTypeParams;
  input_measures?: InputMeasure[];
}

// Flattened Category Definition
export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface CategoryFilter {
  isActive?: boolean;
  searchTerm?: string;
}

export interface CategoryStats {
  id: string;
  name: string;
  metricsCount: number;
}

export interface MetricDefinition {
  id?: string;
  name: string;
  description?: string;
  type: 'simple' | 'ratio' | 'derived' | 'cumulative' | 'conversion';
  label?: string;
  type_params: MetricTypeParams;

  categoryId?: string;
  unit?: string;
  format?: string;
  tags?: string[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;

  filter?: string;
  metadata?: Record<string, any>;
  config?: MetricConfig;
  time_granularity?: string;
}

// Compatible configuration placeholder, specific structure defined by backend
export interface MetricConfig {
  [key: string]: any;
}

export interface MetricCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  metrics: MetricDefinition[];
  isActive?: boolean; // New: Active status
  sortOrder?: number; // New: Sort order
  createdAt?: string;
  updatedAt?: string;
}

export interface MetricsSummary {
  totalMetrics: number;
  activeMetrics: number;
  categories: number;
  activeCategories?: number; // New: Number of active categories
  lastUpdated: string;
}

export interface MetricValue {
  metricName: string;
  value: number;
  formattedValue: string;
  timestamp: string;
  trend?: 'up' | 'down' | 'stable';
  changePercent?: number;
}

export interface MetricFilter {
  categoryId?: string; // New: Filter by category ID
  type?: string;
  searchTerm?: string;
  tags?: string[]; // New: Filter by tags
  isActive?: boolean; // New: Filter by active status
}

// New: Category operation related interfaces
export interface CategoryOperationResult {
  success: boolean;
  message: string;
  data?: Category;
  errors?: string[];
}

export interface MetricCategoryAssignment {
  metricId: string;
  categoryId: string;
  assignedAt: string;
  assignedBy?: string;
}

export interface BulkCategoryOperation {
  operation: 'assign' | 'unassign' | 'move';
  metricIds: string[];
  targetCategoryId?: string;
  sourceCategoryId?: string;
}

export interface CategoryValidationRule {
  field: string;
  rule: 'required' | 'unique' | 'maxLength' | 'pattern';
  value?: any;
  message: string;
}

// New: Category import/export interfaces
export interface CategoryExportData {
  categories: Category[];
  metrics: MetricDefinition[];
  assignments: MetricCategoryAssignment[];
  exportedAt: string;
  version: string;
}

export interface CategoryImportResult {
  success: boolean;
  imported: {
    categories: number;
    metrics: number;
    assignments: number;
  };
  errors: string[];
  warnings: string[];
}
