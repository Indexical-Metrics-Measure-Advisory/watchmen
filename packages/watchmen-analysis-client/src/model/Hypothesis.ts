import { MetricDetail } from "./Metric";

export interface RelatedHypothesis {
    id: string;
    title: string;
    description: string;
    status: 'validated' | 'rejected' | 'testing' | 'drafted';
    confidence: number;
  }

export  interface HypothesisType {
    id: string;
    title: string;
    description: string;
    status: 'drafted' | 'testing' | 'validated' | 'rejected';
    confidence: number;
    metrics: string[];
    createdAt: string;
    businessProblemId?: string; // Added business problem reference
    relatedHypothesesIds?: string[]; // Added related hypotheses
    analysisMethod?: string; // Analysis method from EmulativeAnalysisMethod
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