import {BucketId} from './bucket-types';
import {Factor} from './factor-types';
import {
	IndicatorCriteria,
	IndicatorCriteriaOnBucket,
	IndicatorCriteriaOnExpression,
	IndicatorCriteriaOperator
} from './indicator-criteria-types';
import {MeasureMethod} from './indicator-types';
import {tryToTransformColumnToMeasures, tryToTransformToMeasures} from './indicator-utils';
import {SubjectForIndicator} from './query-indicator-types';
import {SubjectDataSetColumn} from './subject-types';

export const isAchievementIndicatorCriteriaOnBucket = (criteria: IndicatorCriteria): criteria is IndicatorCriteriaOnBucket => {
	return (criteria as any).bucketId != null;
};
export const isAchievementIndicatorCriteriaOnExpression = (criteria: IndicatorCriteria): criteria is IndicatorCriteriaOnExpression => {
	return (criteria as any).operator != null;
};
export const getCriteriaArithmetic = (criteria: IndicatorCriteria): BucketId | IndicatorCriteriaOperator | undefined => {
	if (isAchievementIndicatorCriteriaOnBucket(criteria)) {
		return criteria.bucketId;
	} else if (isAchievementIndicatorCriteriaOnExpression(criteria)) {
		return criteria.operator;
	}
	return (void 0);
};
export const isCriteriaArithmeticVisible = (criteria: IndicatorCriteria): boolean => {
	return criteria.factorId != null;
};
export const isCriteriaValueVisible = (criteria: IndicatorCriteria): boolean => {
	return isCriteriaArithmeticVisible(criteria)
		&& ((isAchievementIndicatorCriteriaOnBucket(criteria) && criteria.bucketId != null)
			|| (isAchievementIndicatorCriteriaOnExpression(criteria) && criteria.operator != null));
};
export const showInputForValue = (criteria: IndicatorCriteria): boolean => {
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