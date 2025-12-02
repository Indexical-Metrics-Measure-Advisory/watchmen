export interface AnalysisPurpose {
  language: string;
  text: string;
}

export interface AssistantQuestion {
  id: string;
  text: string;
  category: string;
  isTemplate?: boolean;
}

export interface AssistantTerm {
  id: string;
  term: string;
  definition: string;
  scenarios: string;
  metricIds: string[];
}

export interface AssistantConfig {
  purposes: AnalysisPurpose[];
  selectedMetricIds: string[];
  questions: AssistantQuestion[];
  terms: AssistantTerm[];
}

export interface AssistantProfile {
  id: string;
  name: string;
  config: AssistantConfig;
  createdAt?: string;
  updatedAt?: string;
}