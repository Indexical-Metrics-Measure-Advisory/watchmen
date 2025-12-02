import { BusinessChallenge, BusinessChallengeWithProblems, BusinessProblem } from "./business";
import { HypothesisType } from "./Hypothesis";
import { MetricType } from "./Metric";
import { Insight } from "./Hypothesis";
import Analysis from "@/pages/Analysis";

export interface QuestionResult {
  answerForQuestion: string;
  summaryForHypothesis: string;
  futureAnalysis: string;
  futureBusinessAction: string;
}

export interface AnalysisData{
  
}

export interface EvaluationChallengeAnswerResult {
  goal_alignment?: string;
  goal_alignment_score?: number;
  challenge_understanding?: string;
  challenge_understanding_score?: number;
  hypothesis_coverage?: string;
  hypothesis_coverage_score?: number;
  actionable_insights?: string;
  actionable_insights_score?: number;
  verification_reliability?: string;
  verification_reliability_score?: number;
  data_sufficiency?: string;
  data_sufficiency_score?: number;
}

export interface ChallengeAnalysisResult {
  id: string;
  businessChallengeId: string;
  challengeInsightResult?: any;
  title: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
  status: 'in_progress' | 'completed' | 'failed';
  insights: Insight[];
  validatedHypotheses: HypothesisType[];
  rejectedHypotheses: HypothesisType[];
  keyMetrics: MetricType[];
  businessProblems: BusinessProblem[];
  recommendations: string[];
  nextSteps: string[];
  questionResultDict?: { [problemId: string]: QuestionResult };
  hypothesisResultDict?: { [hypothesisId: string]: any };
  evaluation?: EvaluationChallengeAnswerResult;
  challengeMarkdown?: string; 
}

export interface HypothesisResult {
  hypothesisId: string;
  hypothesisValidationFlag: boolean;
  hypothesisValidationReason: string;
  hypothesisValidationDetail: string;
}

export interface SimulationResult {
  simulationId: string;
  result: ChallengeAnalysisResult;
  challenge: BusinessChallengeWithProblems
}

export interface ChallengeAnalysisSummary {
  id: string;
  businessChallengeId: string;
  title: string;
  summary: string;
  createdAt: string;
  status: 'in_progress' | 'completed' | 'failed';
  insightsCount: number;
  validatedHypothesesCount: number;
  rejectedHypothesesCount: number;
}