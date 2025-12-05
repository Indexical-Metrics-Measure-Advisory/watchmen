export type BIChartType = 'line' | 'bar' | 'stackedBar' | 'pie' | 'area' | 'groupedBar';

export type BICardSize = 'sm' | 'md' | 'lg';

export interface BICategory {
  id: string;
  name: string;
  description?: string;
}

export type BIMetricKind = 'count' | 'rate' | 'amount';

export interface BIMetric {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  kind: BIMetricKind;
  dimensions: string[];
}

export interface BIDimensionSelection {
  dimensions: string[]; // selected analysis dimensions
  timeRange?: string; // e.g., Past 7 days, Past 30 days
}

export interface BIChartCard {
  id: string;
  title: string;
  metricId: string;
  chartType: BIChartType;
  size: BICardSize;
  selection: BIDimensionSelection;
}

export interface BIAnalysis {
  id: string;
  name: string;
  description?: string;
  cards: BIChartCard[];
  isTemplate?: boolean;
  userId: string;
}

export interface BIAnalysisInput {
  id: string;
  name: string;
  description?: string;
  cards: BIChartCard[];
  isTemplate?: boolean;
}

// export interface BIAnalysisUpdate {
//   id: string;
//   name?: string;
//   description?: string;
//   cards?: BIChartCard[];
//   isTemplate?: boolean;
// }

export interface BIAnalysisTemplate {
  id: string;
  
  isTemplate?: boolean;
}

export interface BIAnalysisListItem {
  id: string;
  name: string;
  description?: string;

  cardCount: number;
  isTemplate?: boolean;
}