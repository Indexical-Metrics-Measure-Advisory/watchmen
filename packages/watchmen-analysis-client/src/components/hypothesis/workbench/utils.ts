import { HypothesisType } from '@/model/Hypothesis';

const DAY_MS = 24 * 60 * 60 * 1000;
const DUE_THRESHOLD_DAYS = 7;

export const ageInDays = (hypothesis: HypothesisType): number => {
  return Math.max(0, Math.floor((Date.now() - new Date(hypothesis.createdAt).getTime()) / DAY_MS));
};

// A hypothesis is due for validation when it sits in drafted/testing for more than 7 days
export const isDueForValidation = (hypothesis: HypothesisType): boolean => {
  return (hypothesis.status === 'drafted' || hypothesis.status === 'testing')
    && ageInDays(hypothesis) >= DUE_THRESHOLD_DAYS;
};

// Status badge colors carried over from the retired HypothesisCard
export const hypothesisStatusConfig = {
  drafted: { color: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground' },
  testing: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', dot: 'bg-blue-500' },
  validated: { color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300', dot: 'bg-green-500' },
  rejected: { color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', dot: 'bg-red-500' },
} as const;

export type HypothesisStatus = keyof typeof hypothesisStatusConfig;

export const hypothesisStatuses: HypothesisStatus[] = ['drafted', 'testing', 'validated', 'rejected'];
