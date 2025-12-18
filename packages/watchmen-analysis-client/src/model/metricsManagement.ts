export interface OffsetWindow {
  count: number;
  granularity: string;
}

export interface MetricReference {
  name: string;
  filter?: any;
  alias: string;
  offset_window?: OffsetWindow;
  offset_to_grain?: any;
}

export interface InputMeasure {
  name: string;
  filter?: any;
  alias?: string;
  join_to_timespine: boolean;
  fill_nulls_with?: any;
}

export interface MeasureReference {
  name: string;
  filter?: string;
  alias?: string;
  join_to_timespine: boolean;
  fill_nulls_with?: any;
}

export interface MetricTypeParams {
  measure?: MeasureReference;
  numerator?: MeasureReference;
  denominator?: MeasureReference;
  expr?: string;
  window?: any;
  grain_to_date?: any;
  metrics?: MetricReference[];
  conversion_type_params?: any;
  cumulative_type_params?: any;
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
  type: 'simple' | 'ratio' | 'derived';
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
