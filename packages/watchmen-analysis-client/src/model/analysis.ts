import { HypothesisType } from "./Hypothesis";

export enum EmulativeAnalysisMethod {
  TREND_ANALYSIS = 'Trend Analysis',
  DISTRIBUTION_ANALYSIS = 'Distribution Analysis',
  COMPARISON_ANALYSIS = 'Comparison Analysis',
  CORRELATION_ANALYSIS = 'Correlation Analysis',
  COMPOSITION_ANALYSIS = 'Composition Analysis',
  FEATURES_IMPORTANCE = 'Features importance'
}

export interface CustomerCharacteristic {
  label: string;
  value: string;
  percentage: number;
}
export interface BusinessContext {
  industry: string;
  marketSize: number;
  competitors: string[];
  targetMarket: string;
};

export interface PurchaseBehavior {
  icon: string;
  title: string;
  description: string;
}


export enum DimensionType {
  CATEGORICAL = 'CATEGORICAL',
  NUMERICAL = 'numerical',
  TIME = 'TIME',
  TEXT = 'text',
  BOOLEAN = 'boolean',
  GEO = 'geo',
  BUCKET = 'bucket'
}

export interface MetricDimension {
  name: string;
  description?: string;
  qualified_name?: string;
  importance?: number;
  metricId?: string;
  dimensionType?: DimensionType;
}

export interface AnalysisMetric {
  name: string;
  category: string;
  categoryId?: string;
  dataset: AnalysisDataset;
  dimensions: MetricDimension[]
}

export interface AnalysisDataset {
  dataset: MetricFlowResponse
}

export interface MetricFlowResponse{
    data: any
    column_names: string[]
}


export interface DataExplain {
  hypothesisValidation :string
  hypothesisValidationFlag: boolean
  keyMetricChange :string
  summaryFinding:string
}


export interface HypothesisAnalysisData {
  analysis_id: string;
  hypothesis: HypothesisType;
  analysis_metrics?: AnalysisMetric[]
  data_explain_dict?:  DataExplain []

}

export interface AnalysisData {
  hypotheses: HypothesisType[];
  ageDistributionData: Array<{
    name: string;
    value: number;
    conversion: number;
  }>;
  metricTrendData: Array<{
    month: string;
    conversionRate: number;
    customerAcquisitionRate: number;
  }>;
  testResults: Array<{
    name: string;
    conversionA: number;
    conversionB: number;
    sampleSize: number;
    pValue: number;
  }>;
  metricsCardData: {
    significance: {
      pValue: number;
      label: string;
    };
    analysisData: {
      sampleSize: number;
      duration: string;
    };
    lastAnalysis: {
      date: string;
      daysAgo: string;
    };
  };
  customerCharacteristics?: CustomerCharacteristic[];
  purchaseBehaviors?: PurchaseBehavior[];
}
  