import {
	ObjectiveFactor,
	ObjectiveFactorKind,
	ObjectiveFactorOnComputation,
	ObjectiveFactorOnIndicator,
	ObjectiveVariable,
	ObjectiveVariableKind,
	ObjectiveVariableOnBucket,
	ObjectiveVariableOnRange,
	ObjectiveVariableOnValue
} from './objective-types';

export const isIndicatorFactor = (factor: ObjectiveFactor): factor is ObjectiveFactorOnIndicator => factor.kind === ObjectiveFactorKind.INDICATOR;
export const isComputedFactor = (factor: ObjectiveFactor): factor is ObjectiveFactorOnComputation => factor.kind === ObjectiveFactorKind.COMPUTED;
export const isValueVariable = (variable: ObjectiveVariable): variable is ObjectiveVariableOnValue => variable.kind === ObjectiveVariableKind.SINGLE_VALUE;
export const isRangeVariable = (variable: ObjectiveVariable): variable is ObjectiveVariableOnRange => variable.kind === ObjectiveVariableKind.RANGE;
export const isBucketVariable = (variable: ObjectiveVariable): variable is ObjectiveVariableOnBucket => variable.kind === ObjectiveVariableKind.BUCKET;