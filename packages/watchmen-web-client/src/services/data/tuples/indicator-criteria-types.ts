import {BucketId} from './bucket-types';
import {FactorId} from './factor-types';

export interface IndicatorCriteria {
	factorId?: FactorId;
}

/** fill when use predefined bucket */
export interface IndicatorCriteriaOnBucket extends IndicatorCriteria {
	bucketId?: BucketId;
	bucketSegmentName?: string;
}

export enum IndicatorCriteriaOperator {
	EQUALS = 'equals',
	NOT_EQUALS = 'not-equals',
	LESS = 'less',
	LESS_EQUALS = 'less-equals',
	MORE = 'more',
	MORE_EQUALS = 'more-equals',
}

export interface IndicatorCriteriaOnExpression extends IndicatorCriteria {
	operator?: IndicatorCriteriaOperator;
	value?: string;
}