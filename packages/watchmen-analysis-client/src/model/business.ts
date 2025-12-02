import { HypothesisWithMetrics } from "./Hypothesis";

export interface BusinessProblem {
  id: string;
  title: string;
  description: string;
  businessChallengeId?: string;
  status: 'open' | 'in_progress' | 'resolved';
  hypothesisIds: string[];
  metrics?: string[];
  createdAt: string;
  aiAnswer?: string;
}

export interface BusinessChallenge {
  id: string;
  title: string;
  description: string;
  problemIds: string[];
  createdAt?: string;
  problems?: BusinessProblem[];
  datasetStartDate?: string;
  datasetEndDate?: string;
}

export interface BusinessProblemWithHypotheses extends BusinessProblem {
  hypotheses: HypothesisWithMetrics[]
}


export interface BusinessChallengeWithProblems extends BusinessChallenge {
  problems: BusinessProblemWithHypotheses[]
}

