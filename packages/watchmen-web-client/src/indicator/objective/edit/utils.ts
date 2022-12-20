import {
	ObjectiveFactor,
	ObjectiveFactorKind,
	ObjectiveFactorOnComputation,
	ObjectiveFactorOnIndicator
} from '@/services/data/tuples/objective-types';

export const isIndicatorFactor = (factor: ObjectiveFactor): factor is ObjectiveFactorOnIndicator => factor.kind === ObjectiveFactorKind.INDICATOR;
export const isComputedFactor = (factor: ObjectiveFactor): factor is ObjectiveFactorOnComputation => factor.kind === ObjectiveFactorKind.COMPUTED;