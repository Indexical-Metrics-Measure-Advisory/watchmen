import {Bucket} from '@/services/data/tuples/bucket-types';
import {
	isCategoryMeasureBucket,
	isEnumMeasureBucket,
	isNumericValueMeasureBucket
} from '@/services/data/tuples/bucket-utils';
import {IndicatorCriteria, IndicatorCriteriaOperator} from '@/services/data/tuples/indicator-criteria-types';
import {Indicator} from '@/services/data/tuples/indicator-types';
import {
	findTopicAndFactor,
	tryToTransformColumnToMeasures,
	tryToTransformToMeasures
} from '@/services/data/tuples/indicator-utils';
import {isNotNull} from '@/services/data/utils';
import {DropdownOption} from '@/widgets/basic/types';
import {Lang} from '@/widgets/langs';
import {IndicatorCriteriaDefData} from './types';

export const CriteriaArithmeticLabel: Record<IndicatorCriteriaOperator, string> = {
	[IndicatorCriteriaOperator.EQUALS]: Lang.PARAMETER.EXPRESSION_OPERATOR.EQUALS,
	[IndicatorCriteriaOperator.NOT_EQUALS]: Lang.PARAMETER.EXPRESSION_OPERATOR.NOT_EQUALS,
	[IndicatorCriteriaOperator.LESS]: Lang.PARAMETER.EXPRESSION_OPERATOR.LESS,
	[IndicatorCriteriaOperator.LESS_EQUALS]: Lang.PARAMETER.EXPRESSION_OPERATOR.LESS_EQUALS,
	[IndicatorCriteriaOperator.MORE]: Lang.PARAMETER.EXPRESSION_OPERATOR.MORE,
	[IndicatorCriteriaOperator.MORE_EQUALS]: Lang.PARAMETER.EXPRESSION_OPERATOR.MORE_EQUALS
};

// noinspection DuplicatedCode
export const findAvailableBuckets = (criteria: IndicatorCriteria, indicator: Indicator, defData: IndicatorCriteriaDefData): Array<Bucket> => {
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

export const buildValueBucketOptions = (criteria: IndicatorCriteria, indicator: Indicator, defData: IndicatorCriteriaDefData) => {
	return findAvailableBuckets(criteria, indicator, defData).map(bucket => {
		return {
			value: bucket.bucketId,
			label: bucket.name || 'Noname Bucket'
		};
	});
};

export const buildFactorOptions = (defData: IndicatorCriteriaDefData): Array<DropdownOption> => {
	if (defData.topic != null) {
		// factors which defined as buckets in indicator and factors which has time measure
		// can be used as achievement indicator criteria
		// const isFactorSupported = (factor: Factor): boolean => {
		// 	const measures = tryToTransformToMeasures(factor);
		// 	if (measures.some(isTimePeriodMeasure)) {
		// 		return true;
		// 	}
		// 	if (factor.enumId != null) {
		// 		// enumeration factor
		// 		return true;
		// 	} else {
		// 		// not an enumeration factor, at least one bucket is matched
		// 		return factor.enumId == null && defData.measureBuckets.some(bucket => isMeasureBucket(bucket) && measures.includes(bucket.measure));
		// 	}
		// };
		// noinspection JSUnusedLocalSymbols
		return (defData.topic.factors || []).filter(factor => {
			// eslint-disable-next-line
			return true; //indicator.factorId == factor.factorId || isFactorSupported(factor);
		}).sort((f1, f2) => {
			return (f1.label || f1.name || '').localeCompare(f2.label || f2.name || '', void 0, {
				sensitivity: 'base',
				caseFirst: 'upper'
			});
		}).map(factor => {
			return {
				value: factor.factorId,
				label: factor.label || factor.name || 'Noname Factor'
			};
		});
	} else if (defData.subject != null) {
		// const isColumnSupported = (column: SubjectDataSetColumn): boolean => {
		// 	const measures = tryToTransformColumnToMeasures(column, defData.subject!);
		// 	if (measures.some(isTimePeriodMeasure)) {
		// 		return true;
		// 	}
		// 	const {factor} = findTopicAndFactor(column, defData.subject);
		// 	const enumId = factor != null ? factor.enumId : (void 0);
		// 	if (enumId != null) {
		// 		// enumeration factor
		// 		return true;
		// 	} else {
		// 		// not an enumeration factor, at least one bucket is matched
		// 		return enumId == null && defData.measureBuckets.some(bucket => isMeasureBucket(bucket) && measures.includes(bucket.measure));
		// 	}
		// };
		return (defData.subject.dataset.columns || []).filter(column => {
			// eslint-disable-next-line
			return column.recalculate !== true; //indicator.factorId == column.columnId || isColumnSupported(column);
		}).sort((c1, c2) => {
			return (c1.alias || '').localeCompare(c2.alias || '', void 0, {
				sensitivity: 'base',
				caseFirst: 'upper'
			});
		}).map(column => {
			return {
				value: column.columnId,
				label: column.alias || 'Noname Factor'
			};
		});
	} else {
		return [];
	}
};