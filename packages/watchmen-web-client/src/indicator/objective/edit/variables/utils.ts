import {
	ObjectiveVariable,
	ObjectiveVariableKind,
	ObjectiveVariableOnBucket,
	ObjectiveVariableOnRange,
	ObjectiveVariableOnValue
} from '@/services/data/tuples/objective-types';

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