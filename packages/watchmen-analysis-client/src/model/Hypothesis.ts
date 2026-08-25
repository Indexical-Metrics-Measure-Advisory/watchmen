import { MetricDetail } from "./Metric";

export interface RelatedHypothesis {
    id: string;
    title: string;
    description: string;
    status: 'validated' | 'rejected' | 'testing' | 'drafted';
    confidence: number;
  }

export interface HypothesisContext {
    source: 'manual' | 'chart' | 'alert' | 'chat'; // where the hypothesis was proposed
    sourceId?: string; // analysisId / alertRuleId / chatMessageId
    metrics?: string[]; // metric names covered at proposal time (multiple for analysis-level hypotheses)
    dimensions?: string[];
    timeRange?: string;
    filters?: Record<string, string>;
}

export  interface HypothesisType {
    id: string;
    title: string;
    description: string;
    status: 'drafted' | 'testing' | 'validated' | 'rejected';
    confidence: number;
    metrics: string[];
    createdAt: string;
    businessChallengeId?: string; // Added business challenge reference
    relatedHypothesesIds?: string[]; // Added related hypotheses
    analysisMethod?: string; // Analysis method from EmulativeAnalysisMethod
    context?: HypothesisContext; // analysis scenario the hypothesis was proposed from
    // metrics_details?: MetricDetail[];
}


export interface HypothesisWithMetrics extends HypothesisType {
  metrics_details: MetricDetail[]
}


export interface Insight {
  title: string;
  type:"risk" | "trendup" | "opportunity";
  description: string;
  priority: 'high' | 'medium' | 'low';
}