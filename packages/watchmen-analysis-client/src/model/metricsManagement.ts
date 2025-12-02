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
  // 兼容历史字段（部分页面仍使用）：
  categoryId?: string;
  unit?: string;
  format?: string;
  tags?: string[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  // 基于后端模型新增：
  filter?: string;
  metadata?: Record<string, any>;
  config?: MetricConfig;
  time_granularity?: string;
}

// 兼容型配置占位，具体结构由后端定义
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
  isActive?: boolean; // 新增：激活状态
  sortOrder?: number; // 新增：排序
  createdAt?: string;
  updatedAt?: string;
}

export interface MetricsSummary {
  totalMetrics: number;
  activeMetrics: number;
  categories: number;
  activeCategories?: number; // 新增：激活的分类数量
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
  categoryId?: string; // 新增：按分类ID筛选
  type?: string;
  searchTerm?: string;
  tags?: string[]; // 新增：按标签筛选
  isActive?: boolean; // 新增：按激活状态筛选
}

// 新增：分类操作相关接口
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

// 新增：分类导入导出接口
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
