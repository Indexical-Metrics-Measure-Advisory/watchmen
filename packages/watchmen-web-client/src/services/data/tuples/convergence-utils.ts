import {
	ConvergenceBucketVariable,
	ConvergenceFreeWalkVariable,
	ConvergenceTimeFrameVariable,
	ConvergenceVariable,
	ConvergenceVariableType
} from './convergence-types';

export const isBucketVariable = (variable: ConvergenceVariable): variable is ConvergenceBucketVariable => variable.type === ConvergenceVariableType.BUCKET;
export const isTimeFrameVariable = (variable: ConvergenceVariable): variable is ConvergenceTimeFrameVariable => variable.type === ConvergenceVariableType.TIMEFRAME;
export const isFreeWalkVariable = (variable: ConvergenceVariable): variable is ConvergenceFreeWalkVariable => variable.type === ConvergenceVariableType.FREE_WALK;
