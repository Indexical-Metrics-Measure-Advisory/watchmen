export type BIChartType = 'line' | 'bar' | 'stackedBar' | 'pie' | 'area' | 'groupedBar' | 'alert' | 'kpi';

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
  timeGranularity?: string;
}

export interface AlertAction {
  type: string;
  suggestedActionId?: string;
  target?: string;
  template?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  name?: string;
  content?: string;
  expectedEffect?: string;
  parameters?: Record<string, any>;
}

export interface AlertCondition {
  metricId?: string; // Moved from GlobalAlertRule
  metricName?: string; // Optional, for display purposes
  
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  value: number | string;
}

export interface AlertConfig {
  enabled: boolean;
  name?: string;
  priority?: 'high' | 'medium' | 'low' | 'critical';
  description?: string;
  conditionLogic?: 'and' | 'or';
  conditions?: AlertCondition[];
  actions?: AlertAction[];
  nextAction?: AlertAction;
  decision?: string; // Description of the decision/recommendation
}

export interface GlobalAlertRule extends AlertConfig {
  id: string;
}

export interface BIChartCard {
  id: string;
  title: string;
  metricId: string;
  chartType: BIChartType;
  size: BICardSize;
  selection: BIDimensionSelection;
  alert?: AlertConfig;
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