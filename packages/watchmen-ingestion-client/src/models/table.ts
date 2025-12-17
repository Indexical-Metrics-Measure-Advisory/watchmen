/**
 * Table data models
 * Based on Python backend CollectorTableConfig and related models
 */

/**
 * Entity criteria operators
 */
export enum EntityCriteriaOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not-equals',
  LESS = 'less',
  GREATER = 'more',
  LESS_EQUALS = 'less-equals',
  GREATER_EQUALS = 'more-equals',
  IS_EMPTY = 'empty',
  IS_NOT_EMPTY = 'not-empty',
  IS_BLANK = 'blank',
  IS_NOT_BLANK = 'not-blank',
  LIKE = 'like',
  NOT_LIKE = 'not-like',
  IN = 'in',
  NOT_IN = 'not-in'
}

/**
 * Condition interface - base condition structure
 * Corresponds to Python Condition model
 */
export interface Condition {
  columnName: string;
  operator: EntityCriteriaOperator;
  columnValue?: number[] | string[] | number | string | null;
}

/**
 * Join condition for table relationships
 * Corresponds to Python JoinCondition class
 */
export interface JoinCondition {
  parentKey?: Condition;
  childKey?: Condition;
}

/**
 * Dependence definition for table dependencies
 * Corresponds to Python Dependence class
 */
export interface Dependence {
  modelName?: string;
  objectKey?: string; // the dependent column
}

/**
 * JSON column configuration
 * Corresponds to Python JsonColumn class
 */
export interface JsonColumn {
  columnName?: string;
  ignoredPath?: string[];
  needFlatten?: boolean;
  flattenPath?: string[];
  jsonPath?: string[];
}

/**
 * Table status enumeration
 */
export type TableStatus = 'active' | 'inactive' | 'pending';

/**
 * Collector Table Configuration
 * Corresponds to Python CollectorTableConfig class
 * This is the main table configuration interface matching the backend model
 */
export interface CollectorTableConfig {
  // Core identification
  configId?: string;
  name?: string;
  tableName?: string;
  
  // Key configurations
  primaryKey?: string[];
  objectKey?: string;
  sequenceKey?: string;
  
  // Model and parent relationships
  modelName?: string;
  parentName?: string;
  label?: string;
  
  // Complex nested structures
  joinKeys?: JoinCondition[];
  dependOn?: Dependence[];
  conditions?: Condition[];
  jsonColumns?: JsonColumn[];
  
  // Column configurations
  auditColumn?: string;
  ignoredColumns?: string[];
  
  // Data source and flags
  dataSourceId?: string;
  isList?: boolean;
  triggered?: boolean;
  
  // Tenant and audit fields (from TenantBasedTuple and OptimisticLock)
  tenantId?: string;
  createdAt?: string;
  createdBy?: string;
  lastModifiedAt?: string;
  lastModifiedBy?: string;
  version?: number; // OptimisticLock version
}

/**
 * Legacy table field definition for backward compatibility
 */
export interface TableField {
  name: string;
  type: string;
  description: string;
  isPrimaryKey: boolean;
}

/**
 * Table creation request (excludes auto-generated fields)
 */
export type CreateTableRequest = Omit<CollectorTableConfig, 'configId' | 'createdAt' | 'lastModifiedAt' | 'version'>;

/**
 * Table update request (partial fields)
 */
export type UpdateTableRequest = Partial<Omit<CollectorTableConfig, 'configId' | 'createdAt' | 'createdBy'>>;

/**
 * Table filter parameters for queries
 */
export interface TableFilterParams {
  search?: string;
  status?: TableStatus | 'all';
  schema?: string;
  modelName?: string;
  tableName?: string;
  tenantId?: string;
  page?: number;
  limit?: number;
  sortBy?: keyof CollectorTableConfig;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response for table list
 */
export interface PaginatedTableResponse {
  items: CollectorTableConfig[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Utility functions for constructing complex objects
 * These mirror the Python construct_* functions
 */

export function constructCondition(condition: any): Condition | undefined {
  if (!condition) return undefined;

  // Handle backend format (columnName/columnValue)
  if (condition.columnName !== undefined) {
    return {
      columnName: condition.columnName,
      operator: condition.operator || EntityCriteriaOperator.EQUALS,
      columnValue: condition.columnValue
    } as Condition;
  }

  // Handle legacy frontend format (field/value) - convert to new format
  if (condition.field !== undefined) {
    return {
      columnName: condition.field,
      operator: condition.operator || EntityCriteriaOperator.EQUALS,
      columnValue: condition.value
    } as Condition;
  }

  return condition as Condition;
}

export function constructConditions(conditions?: any[]): Condition[] | undefined {
  if (!conditions) return undefined;
  return conditions.map(constructCondition).filter(Boolean) as Condition[];
}

export function constructJoinCondition(joinCondition: any): JoinCondition | undefined {
  if (!joinCondition) return undefined;
  return {
    parentKey: constructCondition(joinCondition.parentKey),
    childKey: constructCondition(joinCondition.childKey)
  };
}

export function constructJoinConditions(joinConditions?: any[]): JoinCondition[] | undefined {
  if (!joinConditions) return undefined;
  return joinConditions.map(constructJoinCondition).filter(Boolean) as JoinCondition[];
}

export function constructDependence(dependence: any): Dependence | undefined {
  if (!dependence) return undefined;
  if (typeof dependence === 'object') {
    return dependence as Dependence;
  }
  return dependence;
}

export function constructDependencies(dependencies?: any[]): Dependence[] | undefined {
  if (!dependencies) return undefined;
  return dependencies.map(constructDependence).filter(Boolean) as Dependence[];
}

export function constructJsonColumn(jsonColumn: any): JsonColumn | undefined {
  if (!jsonColumn) return undefined;
  if (typeof jsonColumn === 'object') {
    return jsonColumn as JsonColumn;
  }
  return jsonColumn;
}

export function constructJsonColumns(jsonColumns?: any[]): JsonColumn[] | undefined {
  if (!jsonColumns) return undefined;
  return jsonColumns.map(constructJsonColumn).filter(Boolean) as JsonColumn[];
}