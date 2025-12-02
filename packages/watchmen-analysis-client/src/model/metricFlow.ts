export interface MetricQueryRequest {
  metric: string;
  group_by?: string[];
  where?: string;
  start_time?: string; // ISO datetime string
  end_time?: string;   // ISO datetime string
  order?: string[];
  limit?: number;
}

export type CellValue = string | number | boolean | null;

export interface MetricFlowResponse {
  // 2D table data: rows × columns
  data: CellValue[][];
  // Column names aligned with each inner array item
  column_names: string[];
}
