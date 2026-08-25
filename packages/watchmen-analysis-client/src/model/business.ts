import { HypothesisWithMetrics } from "@/model/Hypothesis";

export interface BusinessChallenge {
  id: string;
  title: string;
  description: string;
  createdAt?: string;
  datasetStartDate?: string;
  datasetEndDate?: string;
}

export interface BusinessChallengeWithHypotheses extends BusinessChallenge {
  hypotheses: HypothesisWithMetrics[]
}
