import {BucketId} from '@/services/data/tuples/bucket-types';
import {Factor} from '@/services/data/tuples/factor-types';
import {MeasureMethod} from '@/services/data/tuples/indicator-types';
import {
	findTopicAndFactor,
	tryToTransformColumnToMeasures,
	tryToTransformToMeasures
} from '@/services/data/tuples/indicator-utils';
import {
	Objective,
	ObjectiveFactor,
	ObjectiveFactorKind,
	ObjectiveFactorOnComputation,
	ObjectiveFactorOnIndicator,
	ObjectiveVariable,
	ObjectiveVariableKind,
	ObjectiveVariableOnBucket,
	ObjectiveVariableOnRange,
	ObjectiveVariableOnValue
} from '@/services/data/tuples/objective-types';
import {QueryByBucketMethod, QueryByEnumMethod, QueryByMeasureMethod} from '@/services/data/tuples/query-bucket-types';
import {SubjectForIndicator} from '@/services/data/tuples/query-indicator-types';
import {SubjectDataSetColumn} from '@/services/data/tuples/subject-types';
import {isNotBlank} from '@/services/utils';

export const isIndicatorFactor = (factor: ObjectiveFactor): factor is ObjectiveFactorOnIndicator => factor.kind === ObjectiveFactorKind.INDICATOR;
export const isComputedFactor = (factor: ObjectiveFactor): factor is ObjectiveFactorOnComputation => factor.kind === ObjectiveFactorKind.COMPUTED;
export const isValueVariable = (variable: ObjectiveVariable): variable is ObjectiveVariableOnValue => variable.kind === ObjectiveVariableKind.SINGLE_VALUE;
export const isRangeVariable = (variable: ObjectiveVariable): variable is ObjectiveVariableOnRange => variable.kind === ObjectiveVariableKind.RANGE;
export const isBucketVariable = (variable: ObjectiveVariable): variable is ObjectiveVariableOnBucket => variable.kind === ObjectiveVariableKind.BUCKET;
export const defendVariableAndRemoveUnnecessary = (variable: ObjectiveVariable) => {
	if (isValueVariable(variable)) {
		variable.value = variable.value ?? (variable as unknown as ObjectiveVariableOnRange).min;
		delete (variable as unknown as ObjectiveVariableOnRange).min;
		delete (variable as unknown as ObjectiveVariableOnRange).max;
		delete (variable as unknown as ObjectiveVariableOnRange).includeMin;
		delete (variable as unknown as ObjectiveVariableOnRange).includeMax;
		delete (variable as unknown as ObjectiveVariableOnBucket).bucketId;
		delete (variable as unknown as ObjectiveVariableOnBucket).segmentName;
	} else if (isRangeVariable(variable)) {
		variable.min = variable.min ?? (variable as unknown as ObjectiveVariableOnValue).value;
		variable.includeMin = variable.includeMin ?? true;
		variable.includeMax = variable.includeMax ?? true;
		delete (variable as unknown as ObjectiveVariableOnValue).value;
		delete (variable as unknown as ObjectiveVariableOnBucket).bucketId;
		delete (variable as unknown as ObjectiveVariableOnBucket).segmentName;
	} else if (isBucketVariable(variable)) {
		delete (variable as unknown as ObjectiveVariableOnValue).value;
		delete (variable as unknown as ObjectiveVariableOnRange).min;
		delete (variable as unknown as ObjectiveVariableOnRange).max;
		delete (variable as unknown as ObjectiveVariableOnRange).includeMin;
		delete (variable as unknown as ObjectiveVariableOnRange).includeMax;
	}
};

export const askVariableBucketIds = (objective: Objective): Array<BucketId> => {
	return (objective.variables || [])
		.filter(v => isBucketVariable(v) && isNotBlank(v.bucketId))
		.map(v => (v as ObjectiveVariableOnBucket).bucketId)
		.filter(bucketId => isNotBlank(bucketId)) as Array<BucketId>;
};

export const computeMeasureMethodOnFactor = (factor: Factor): Array<QueryByBucketMethod> => {
	return tryToTransformToMeasures(factor).map(method => {
		if (method !== MeasureMethod.ENUM) {
			return {method} as QueryByMeasureMethod;
		} else if (factor.enumId != null) {
			return {enumId: factor.enumId, method: MeasureMethod.ENUM} as QueryByEnumMethod;
		} else {
			return null;
		}
	}).filter(x => x != null) as Array<QueryByBucketMethod>;
};

export const computeMeasureMethodOnColumn = (column: SubjectDataSetColumn, subject: SubjectForIndicator): Array<QueryByBucketMethod> => {
	return tryToTransformColumnToMeasures(column, subject).map(method => {
		if (method !== MeasureMethod.ENUM) {
			return {method} as QueryByMeasureMethod;
		} else {
			const {factor} = findTopicAndFactor(column, subject);
			if (factor != null && factor.enumId != null) {
				return {enumId: factor.enumId, method: MeasureMethod.ENUM} as QueryByEnumMethod;
			}
		}
		return null;
	}).filter(x => x != null) as Array<QueryByBucketMethod>;
};