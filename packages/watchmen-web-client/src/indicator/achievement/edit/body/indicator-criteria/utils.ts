import {Bucket, BucketId} from '@/services/data/tuples/bucket-types';
import {
	isCategoryMeasureBucket,
	isEnumMeasureBucket,
	isNumericValueMeasureBucket
} from '@/services/data/tuples/bucket-utils';
import {Factor} from '@/services/data/tuples/factor-types';
import {Indicator, MeasureMethod} from '@/services/data/tuples/indicator-types';
import {
	findTopicAndFactor,
	tryToTransformColumnToMeasures,
	tryToTransformToMeasures
} from '@/services/data/tuples/indicator-utils';
import {
	AchievementIndicatorCriteria,
	AchievementIndicatorCriteriaOperator
} from '@/services/data/tuples/achievement-types';
import {
	isAchievementIndicatorCriteriaOnBucket,
	isAchievementIndicatorCriteriaOnExpression
} from '@/services/data/tuples/achievement-utils';
import {SubjectForIndicator} from '@/services/data/tuples/query-indicator-types';
import {SubjectDataSetColumn} from '@/services/data/tuples/subject-types';
import {isNotNull} from '@/services/data/utils';
import {Lang} from '@/widgets/langs';
import {IndicatorCriteriaDefData} from '../types';

export const findAvailableBuckets = (criteria: AchievementIndicatorCriteria, indicator: Indicator, defData: IndicatorCriteriaDefData): Array<Bucket> => {
	// eslint-disable-next-line
	if (criteria.factorId == indicator.factorId) {
		return (indicator.valueBuckets || []).map(bucketId => {
			// eslint-disable-next-line
			return (defData.valueBuckets || []).find(bucket => bucket.bucketId == bucketId);
		}).filter(isNotNull);
	}

	if (defData.topic != null) {
		// eslint-disable-next-line
		const factor = (defData.topic?.factors || []).find(factor => factor.factorId == criteria.factorId);
		if (factor == null) {
			return [];
		}

		return tryToTransformToMeasures(factor).map(measure => {
			if (factor.enumId != null) {
				// eslint-disable-next-line
				return (defData.measureBuckets || []).filter(isEnumMeasureBucket).filter(bucket => bucket.enumId == factor.enumId);
			} else {
				return (defData.measureBuckets || []).filter(bucket => {
					return (isCategoryMeasureBucket(bucket) && bucket.measure === measure)
						|| (isNumericValueMeasureBucket(bucket) && bucket.measure === measure);
				});
			}
		}).flat();
	} else if (defData.subject != null) {
		// eslint-disable-next-line
		const column = (defData.subject.dataset.columns || []).find(column => column.columnId == criteria.factorId);
		if (column == null) {
			return [];
		}

		const {factor} = findTopicAndFactor(column, defData.subject);
		return tryToTransformColumnToMeasures(column, defData.subject).map(measure => {
			if (factor?.enumId != null) {
				// eslint-disable-next-line
				return (defData.measureBuckets || []).filter(isEnumMeasureBucket).filter(bucket => bucket.enumId == factor.enumId);
			} else {
				return (defData.measureBuckets || []).filter(bucket => {
					return (isCategoryMeasureBucket(bucket) && bucket.measure === measure)
						|| (isNumericValueMeasureBucket(bucket) && bucket.measure === measure);
				});
			}
		}).flat();
	} else {
		return [];
	}
};

export const buildValueBucketOptions = (criteria: AchievementIndicatorCriteria, indicator: Indicator, defData: IndicatorCriteriaDefData) => {
	return findAvailableBuckets(criteria, indicator, defData).map(bucket => {
		return {
			value: bucket.bucketId,
			label: bucket.name || 'Noname Bucket'
		};
	});
};

export const getCriteriaArithmetic = (criteria: AchievementIndicatorCriteria): BucketId | AchievementIndicatorCriteriaOperator | undefined => {
	if (isAchievementIndicatorCriteriaOnBucket(criteria)) {
		return criteria.bucketId;
	} else if (isAchievementIndicatorCriteriaOnExpression(criteria)) {
		return criteria.operator;
	}
	return (void 0);
};

export const isCriteriaArithmeticVisible = (criteria: AchievementIndicatorCriteria): boolean => {
	return criteria.factorId != null;
};

export const isCriteriaValueVisible = (criteria: AchievementIndicatorCriteria): boolean => {
	return isCriteriaArithmeticVisible(criteria)
		&& ((isAchievementIndicatorCriteriaOnBucket(criteria) && criteria.bucketId != null)
			|| (isAchievementIndicatorCriteriaOnExpression(criteria) && criteria.operator != null));
};

export const showInputForValue = (criteria: AchievementIndicatorCriteria): boolean => {
	return !isAchievementIndicatorCriteriaOnBucket(criteria);
};

export const getAvailableTimeRangeOnFactor = (factor?: Factor): { year: boolean; month: boolean } => {
	const measures = factor == null ? [] : tryToTransformToMeasures(factor);
	return {
		year: measures.includes(MeasureMethod.YEAR),
		month: measures.includes(MeasureMethod.MONTH)
	};
};

export const getAvailableTimeRangeOnColumn = (column?: SubjectDataSetColumn, subject?: SubjectForIndicator): { year: boolean; month: boolean } => {
	const measures = (column == null || subject == null) ? [] : tryToTransformColumnToMeasures(column, subject);
	return {
		year: measures.includes(MeasureMethod.YEAR),
		month: measures.includes(MeasureMethod.MONTH)
	};
};

export const getTimeRangePlaceholder = (year: boolean, month: boolean): string | undefined => {
	if (year && month) {
		return Lang.PLAIN.ACHIEVEMENT_CRITERIA_TIME_RANGE_YEAR_MONTH;
	} else if (year) {
		return Lang.PLAIN.ACHIEVEMENT_CRITERIA_TIME_RANGE_YEAR;
	} else if (month) {
		return Lang.PLAIN.ACHIEVEMENT_CRITERIA_TIME_RANGE_MONTH;
	} else {
		return (void 0);
	}
};
