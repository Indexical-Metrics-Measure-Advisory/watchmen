/**
 * Interface representing the quality score of a Data Product.
 */
export interface QualityScore {
  /** Unique identifier for the product */
  id: string;
  /** Display name of the product */
  name: string;
  /** Overall quality score */
  overall: number;
  /** Completeness score */
  completeness: number;
  /** Accuracy score */
  accuracy: number;
  /** Timeliness score */
  timeliness: number;
  /** Consistency score */
  consistency: number;
  /** Trend direction of the quality score */
  trend: 'up' | 'stable' | 'down';
  /** Number of identified issues */
  issues: number;
  /** Overall status of the product quality */
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

/**
 * Interface representing a Quality Issue.
 */
export interface QualityIssue {
  /** Unique identifier for the issue */
  id: number;
  /** Name of the affected product */
  product: string;
  /** Dimension of quality affected */
  dimension: string;
  /** Severity level of the issue */
  severity: 'high' | 'medium' | 'low';
  /** Description of the issue */
  issue: string;
  /** Description or count of affected records */
  affectedRecords: string;
  /** Timestamp when the issue was detected */
  detectedAt: string;
}
