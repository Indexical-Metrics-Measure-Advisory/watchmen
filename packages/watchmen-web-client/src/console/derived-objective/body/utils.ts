import {
    isCategoryMeasureBucket,
    isEnumMeasureBucket,
    isNumericValueBucket,
    isNumericValueMeasureBucket
} from '@/services/data/tuples/bucket-utils';
import {BreakdownDimensionType, BreakdownTarget} from '@/services/data/tuples/derived-objective-types';
import {Factor, FactorId, FactorType} from '@/services/data/tuples/factor-types';
import {Indicator, MeasureMethod} from '@/services/data/tuples/indicator-types';
import {
    findTopicAndFactor,
    isTimePeriodMeasure,
    translateComputeTypeToFactorType,
    tryToTransformToMeasures
} from '@/services/data/tuples/indicator-utils';
import {ObjectiveTargetId} from '@/services/data/tuples/objective-types';
import {isComputedParameter, isTopicFactorParameter} from '@/services/data/tuples/parameter-utils';
import {QueryBucket} from '@/services/data/tuples/query-bucket-types';
import {SubjectForIndicator, TopicForIndicator} from '@/services/data/tuples/query-indicator-types';
import {SubjectDataSetColumnId} from '@/services/data/tuples/subject-types';
import {generateUuid} from '@/services/data/tuples/utils';
import {isNotBlank} from '@/services/utils';
import {Lang} from '@/widgets/langs';
import {DimensionCandidate} from './types';

export const createBreakdownTarget = (targetId: ObjectiveTargetId): BreakdownTarget => {
	return {
		uuid: generateUuid(), targetId,
		name: Lang.PLAIN.NEW_DERIVED_OBJECTIVE_TARGET_BREAKDOWN_NAME,
		dimensions: []
	};
};

interface Candidate {
	could: boolean;
}

const COULD_NOT = {could: false};

interface Could extends Candidate {
	could: true;
	factorOrColumnId: FactorId | SubjectDataSetColumnId;
	onValue: boolean;
	buckets: Array<QueryBucket>;
	timeMeasureMethods: Array<MeasureMethod>;
}

const could = (candidate: Candidate): candidate is Could => {
	return candidate.could;
};
const findMeasureOnIndicatorValue = (indicator: Indicator, buckets: Array<QueryBucket>): Candidate => {
	const could = isNotBlank(indicator.factorId)
		&& indicator.valueBuckets != null
		&& indicator.valueBuckets.length !== 0;
	if (could) {
		const availableBuckets = buckets.filter(bucket => indicator.valueBuckets?.includes(bucket.bucketId));
		if (availableBuckets.length !== 0) {
			return {
				could: true, factorOrColumnId: indicator.factorId!,
				onValue: false, buckets: availableBuckets, timeMeasureMethods: []
			} as Could;
		}
	}
	return COULD_NOT;
};
const findFactorMeasureMethods = (
	factorOrColumnId: FactorId | SubjectDataSetColumnId, factorOrType: Factor | FactorType, buckets: Array<QueryBucket>
): Candidate => {
	const types = [];
	const availableBuckets: Array<QueryBucket> = [];
	const availableTimeMeasureMethods: Array<MeasureMethod> = [];
	const factorType = typeof factorOrType === 'string' ? factorOrType : factorOrType.type;
	// corresponding enumeration can be detected only when given factorOrType is a factor
	if (typeof factorOrType !== 'string') {
		if (factorOrType.enumId != null) {
			// enumeration factor always can be measured, no matter related bucket existed or not
			types.push(BreakdownDimensionType.VALUE);
			// detect the corresponded bucket
			buckets.forEach(bucket => {
				// eslint-disable-next-line eqeqeq
				if (isEnumMeasureBucket(bucket) && bucket.enumId == factorOrType.enumId) {
					availableBuckets.push(bucket);
				}
			});
			if (availableBuckets.length !== 0) {
				types.push(BreakdownDimensionType.BUCKET);
			}
		}
	}

	if ([FactorType.NUMBER, FactorType.UNSIGNED].includes(factorType)) {
		// for numeric values
		availableBuckets.push(...buckets.filter(isNumericValueBucket));
	} else {
		// for non-numeric values
		const measures = tryToTransformToMeasures(factorType);
		const timeMeasures = measures.filter(measure => isTimePeriodMeasure(measure));
		// time based
		if (timeMeasures.length !== 0) {
			types.push(BreakdownDimensionType.TIME_RELATED);
			availableTimeMeasureMethods.push(...timeMeasures);
		}
		// special factor types
		availableBuckets.push(...measures.filter(measure => !isTimePeriodMeasure(measure)).map(measure => {
			return buckets.filter(bucket => {
				return (isNumericValueMeasureBucket(bucket) && bucket.measure === measure)
					|| (isCategoryMeasureBucket(bucket) && bucket.measure === measure);
			});
		}).flat());
	}
	if (availableBuckets.length !== 0) {
		if (!types.includes(BreakdownDimensionType.BUCKET)) {
			types.push(BreakdownDimensionType.BUCKET);
		}
		return {
			could: true, factorOrColumnId,
			onValue: types.includes(BreakdownDimensionType.VALUE),
			buckets: availableBuckets, timeMeasureMethods: availableTimeMeasureMethods
		} as Could;
	} else if (availableTimeMeasureMethods.length !== 0) {
		return {
			could: true, factorOrColumnId,
			onValue: types.includes(BreakdownDimensionType.VALUE),
			buckets: [], timeMeasureMethods: availableTimeMeasureMethods
		} as Could;
	} else if (types.includes(BreakdownDimensionType.VALUE)) {
		return {could: true, factorOrColumnId, onValue: true, buckets: [], timeMeasureMethods: []} as Could;
	}

	return COULD_NOT;
};
export const buildMeasureOnOptions = (options: {
	indicator: Indicator; topic?: TopicForIndicator; subject?: SubjectForIndicator; buckets: Array<QueryBucket>;
}): Array<DimensionCandidate> => {
	const {indicator, topic, subject, buckets} = options;

	const measureOnIndicatorValue = findMeasureOnIndicatorValue(indicator, buckets);

	return [
		...could(measureOnIndicatorValue) ? [{
			value: measureOnIndicatorValue.factorOrColumnId,
			label: Lang.CONSOLE.DERIVED_OBJECTIVE.DIMENSION_ON_INDICATOR_VALUE,
			onValue: false,
			buckets: measureOnIndicatorValue.buckets,
			timeMeasureMethods: []
		}] : [],
		...(subject?.dataset.columns || [])
			.map(column => {
				if (isTopicFactorParameter(column.parameter)) {
					const {factor} = findTopicAndFactor(column, subject);
					if (factor == null) {
						return null;
					}
					const found = findFactorMeasureMethods(column.columnId, factor, buckets);
					if (could(found)) {
						return {
							value: column.columnId, label: column.alias || 'Noname Factor',
							onValue: found.onValue, buckets: found.buckets, timeMeasureMethods: found.timeMeasureMethods
						};
					} else {
						return null;
					}
				} else if (isComputedParameter(column.parameter)) {
					const factorType = translateComputeTypeToFactorType(column.parameter.type);
					if (factorType == null) {
						return null;
					}
					const found = findFactorMeasureMethods(column.columnId, factorType, buckets);
					if (could(found)) {
						return {
							value: column.columnId, label: column.alias || 'Noname Factor',
							onValue: found.onValue, buckets: found.buckets, timeMeasureMethods: found.timeMeasureMethods
						};
					} else {
						return null;
					}
				} else {
					// constant value cannot be measured
					return null;
				}
			})
			.filter(x => x != null) as Array<DimensionCandidate>,
		...(topic?.factors || [])
			.map(factor => {
				const found = findFactorMeasureMethods(factor.factorId, factor, buckets);
				if (could(found)) {
					return {
						value: factor.factorId, label: factor.label || factor.name || 'Noname Factor',
						onValue: found.onValue, buckets: found.buckets, timeMeasureMethods: found.timeMeasureMethods
					};
				} else {
					return null;
				}
			})
			.filter(x => x != null) as Array<DimensionCandidate>
	];
};
