import {BucketType} from '@/services/data/tuples/bucket-types';
import {
	isCategoryMeasureBucket,
	isEnumMeasureBucket,
	isMeasureBucket,
	isNumericValueMeasureBucket
} from '@/services/data/tuples/bucket-utils';
import {EnumId} from '@/services/data/tuples/enum-types';
import {Factor, FactorType} from '@/services/data/tuples/factor-types';
import {Indicator, MeasureMethod} from '@/services/data/tuples/indicator-types';
import {
	findTopicAndFactor,
	isTimePeriodMeasure,
	translateComputeTypeToFactorType,
	tryToTransformToMeasures
} from '@/services/data/tuples/indicator-utils';
import {Inspection, InspectMeasureOn} from '@/services/data/tuples/inspection-types';
import {isComputedParameter, isTopicFactorParameter} from '@/services/data/tuples/parameter-utils';
import {QueryBucket} from '@/services/data/tuples/query-bucket-types';
import {SubjectForIndicator, TopicForIndicator} from '@/services/data/tuples/query-indicator-types';
import {DropdownOption} from '@/widgets/basic/types';
import {Lang} from '@/widgets/langs';

export const couldMeasureOnIndicatorValue = (indicator: Indicator, buckets: Array<QueryBucket>) => {
	return indicator.factorId != null
		&& indicator.valueBuckets != null
		&& indicator.valueBuckets.length !== 0
		&& buckets.some(bucket => bucket.type === BucketType.VALUE);
};

const canFactorMeasured = (factorOrType: Factor | FactorType, buckets: Array<QueryBucket>): boolean => {
	if (typeof factorOrType !== 'string' && factorOrType.enumId != null) {
		// eslint-disable-next-line
		// return buckets.some(bucket => isEnumMeasureBucket(bucket) && bucket.enumId == factorOrType.enumId);
		return true;
	}
	const measures = tryToTransformToMeasures(factorOrType).filter(measure => !isTimePeriodMeasure(measure));
	if (measures.length === 0) {
		return false;
	}

	return measures.some(measure => {
		return buckets.some(bucket => {
			if (isNumericValueMeasureBucket(bucket)) {
				return bucket.measure === measure;
			} else if (isCategoryMeasureBucket(bucket)) {
				return bucket.measure === measure;
			}
			return false;
		});
	});
};

export const buildMeasureOnOptions = (options: {
	indicator: Indicator;
	topic?: TopicForIndicator;
	subject?: SubjectForIndicator;
	buckets: Array<QueryBucket>;
}): Array<DropdownOption> => {
	const {indicator, topic, subject, buckets} = options;

	const canMeasureOnIndicatorValue = couldMeasureOnIndicatorValue(indicator, buckets);

	return [
		{value: InspectMeasureOn.NONE, label: Lang.INDICATOR.INSPECTION.NO_BUCKET_ON},
		...canMeasureOnIndicatorValue ? [{
			value: InspectMeasureOn.VALUE,
			label: Lang.INDICATOR.INSPECTION.MEASURE_ON_VALUE
		}] : [],
		...(subject?.dataset.columns || []).filter(column => {
			if (isTopicFactorParameter(column.parameter)) {
				const {factor} = findTopicAndFactor(column, subject);
				if (factor == null) {
					return false;
				}
				return canFactorMeasured(factor, buckets);
			} else if (isComputedParameter(column.parameter)) {
				const factorType = translateComputeTypeToFactorType(column.parameter.type);
				if (factorType == null) {
					return false;
				} else {
					return canFactorMeasured(factorType, buckets);
				}
			} else {
				// constant value cannot be measured
				return false;
			}
		}).map(column => {
			return {value: column.columnId, label: column.alias || 'Noname Factor'};
		}),
		...(topic?.factors || []).filter(factor => {
			return canFactorMeasured(factor, buckets);
		}).map(factor => {
			return {value: factor.factorId, label: factor.label || factor.name || 'Noname Factor'};
		})
	];
};

export const buildBucketOptions = (options: {
	inspection: Inspection;
	topic?: TopicForIndicator;
	subject?: SubjectForIndicator;
	buckets: Array<QueryBucket>;
}): { available: boolean, options: Array<DropdownOption> } => {
	const {inspection, topic, subject, buckets} = options;

	if (inspection.measureOn == null || inspection.measureOn === InspectMeasureOn.NONE) {
		return {available: false, options: []};
	} else if (inspection.measureOn === InspectMeasureOn.VALUE) {
		return {
			available: true,
			options: buckets.filter(bucket => bucket.type === BucketType.VALUE)
				.map(bucket => {
					return {
						value: bucket.bucketId,
						label: bucket.name || 'Noname Bucket'
					};
				}).sort((o1, o2) => {
					return o1.label.localeCompare(o2.label, void 0, {sensitivity: 'base', caseFirst: 'upper'});
				})
		};
	} else if (inspection.measureOn === InspectMeasureOn.OTHER && inspection.measureOnFactorId == null) {
		return {available: false, options: []};
	} else if (inspection.measureOn === InspectMeasureOn.OTHER && inspection.measureOnFactorId != null) {
		let enumId: EnumId | undefined;
		let factorType: FactorType | null;
		if (topic != null) {
			// eslint-disable-next-line
			const factor = (topic.factors || []).find(factor => factor.factorId == inspection.measureOnFactorId);
			if (factor == null) {
				return {available: true, options: []};
			}
			factorType = factor.type;
			enumId = factor.enumId;
		} else if (subject != null) {
			// eslint-disable-next-line
			const column = (subject.dataset.columns || []).find(column => column.columnId == inspection.measureOnFactorId);
			if (column == null) {
				return {available: true, options: []};
			}
			if (isTopicFactorParameter(column.parameter)) {
				const {factor} = findTopicAndFactor(column, subject);
				if (factor == null) {
					return {available: true, options: []};
				} else {
					factorType = factor.type;
					enumId = factor.enumId;
				}
			} else if (isComputedParameter(column.parameter)) {
				factorType = translateComputeTypeToFactorType(column.parameter.type);
				if (factorType == null) {
					return {available: true, options: []};
				}
			} else {
				// constant value cannot be measured
				return {available: true, options: []};
			}
		} else {
			return {available: true, options: []};
		}
		const measures = tryToTransformToMeasures(factorType).filter(measure => !isTimePeriodMeasure(measure));
		if (measures.length === 0) {
			return {available: true, options: []};
		}

		const availableBuckets = [
			...new Set(measures.map(measure => buckets.filter(bucket => {
				if (!isMeasureBucket(bucket)) {
					return false;
				}
				if (bucket.measure !== measure) {
					return false;
				}

				// eslint-disable-next-line
				return !isEnumMeasureBucket(bucket) || bucket.enumId == enumId;
			})).flat())
		];
		const hasCategoryBucket = measures.includes(MeasureMethod.ENUM)
			|| availableBuckets.some(bucket => isCategoryMeasureBucket(bucket) || isEnumMeasureBucket(bucket));

		return {
			available: true,
			options: [
				...(hasCategoryBucket ? [{
					value: '',
					label: Lang.INDICATOR.INSPECTION.MEASURE_ON_NATURALLY
				}] : []),
				...availableBuckets.map(bucket => {
					return {
						value: bucket.bucketId,
						label: bucket.name || 'Noname Bucket'
					};
				}).sort((o1, o2) => {
					return o1.label.localeCompare(o2.label, void 0, {sensitivity: 'base', caseFirst: 'upper'});
				})
			]
		};
	} else {
		return {available: true, options: []};
	}
};