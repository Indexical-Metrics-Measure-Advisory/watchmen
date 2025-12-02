export interface MetricComparison {
  label: string;
  value: number;
  change: number;
  changeType: 'increase' | 'baseline';
}

export interface KeyFindings {
  summary: string;
  metrics: {
    title: string;
    comparisons: MetricComparison[];
  };
}

export interface RecommendedAction {
  content: string;
}

export interface ResearchSuggestion {
  content: string;
}

export interface InsightsData {
  keyFindings: KeyFindings;
  recommendedActions: RecommendedAction[];
  researchSuggestions: ResearchSuggestion[];
}