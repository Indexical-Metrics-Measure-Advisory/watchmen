import {BucketId} from './bucket-types';
import {ParameterJoint} from './factor-calculator-types';
import {FactorId} from './factor-types';
import {SubjectDataSetColumnId, SubjectId} from './subject-types';
import {TenantId} from './tenant-types';
import {TopicId} from './topic-types';
import {OptimisticLock, Tuple} from './tuple-types';

export enum MeasureMethod {
	// address related
	CONTINENT = 'continent',
	REGION = 'region',
	COUNTRY = 'country',
	PROVINCE = 'province',
	CITY = 'city',
	DISTRICT = 'district',
	FLOOR = 'floor',
	RESIDENCE_TYPE = 'residence-type',
	RESIDENTIAL_AREA = 'residential-area',

	// time related
	YEAR = 'year',
	HALF_YEAR = 'half-year',
	QUARTER = 'quarter',
	MONTH = 'month',
	HALF_MONTH = 'half-month',
	TEN_DAYS = 'ten-days',
	WEEK_OF_YEAR = 'week-of-year',
	WEEK_OF_MONTH = 'week-of-month',
	HALF_WEEK = 'half-week',
	DAY_OF_MONTH = 'day-of-month',
	DAY_OF_WEEK = 'day-of-week',
	DAY_KIND = 'day-kind',
	HOUR = 'hour',
	HOUR_KIND = 'hour-kind',
	AM_PM = 'am-pm',

	// individual related
	GENDER = 'gender',
	OCCUPATION = 'occupation',
	AGE = 'age',
	RELIGION = 'religion',
	NATIONALITY = 'nationality',

	// organization related
	BIZ_TRADE = 'biz-trade',
	BIZ_SCALE = 'biz-scale',

	// boolean
	BOOLEAN = 'boolean',

	// enumeration
	ENUM = 'enum',
}

/** aggregate, not from factor, for each indicator (numeric type) */
export enum IndicatorAggregateArithmetic {
	COUNT = 'count',
	SUM = 'sum',
	AVG = 'avg',
	MAX = 'max',
	MIN = 'min',
	DISTINCT_COUNT = 'distinct_count',
}

export type IndicatorId = string;

export interface IndicatorMeasure {
	factorOrColumnId: FactorId | SubjectDataSetColumnId;
	method: MeasureMethod;
}

export enum RelevantIndicatorType {
	SAME = 'same',
	HIGH_CORRELATED = 'high-correlated',
	WEAK_CORRELATED = 'weak-correlated',
	/** this causes relevant */
	THIS_CAUSES_RELEVANT = 'this-causes-relevant',
	/** relevant causes this */
	RELEVANT_CAUSES_THIS = 'relevant-causes-this',
}

/**
 * indicator always be relevant with others, here are the typically scenarios:
 * 1. indicators from different factors on same topic, flow to different topics, maybe through several pipelines,
 * 2. indicators from same factor, flow to different topics by different computation,
 * 3. indicators have no correlation, still can be relevant in reality.
 *
 * relevance has transitivity, it's very important.
 */
export interface RelevantIndicator {
	indicatorId: IndicatorId;
	type: RelevantIndicatorType;
}

export enum IndicatorBaseOn {
	TOPIC = 'topic',
	SUBJECT = 'subject',
}

export interface IndicatorFilter {
	enabled: boolean;
	joint: ParameterJoint;
}

export interface Indicator extends Tuple, OptimisticLock {
	indicatorId: IndicatorId;
	name: string;
	topicOrSubjectId: TopicId | SubjectId;
	/** is a count indicator when factor is not appointed */
	factorId?: FactorId | SubjectDataSetColumnId;
	aggregateArithmetic: IndicatorAggregateArithmetic;
	baseOn: IndicatorBaseOn;
	/** effective only when factorId is appointed */
	valueBuckets?: Array<BucketId>;
	relevants?: Array<RelevantIndicator>;
	filter?: IndicatorFilter;
	// categories, ordered
	category1?: string;
	category2?: string;
	category3?: string;
	description?: string;
	tenantId?: TenantId;
}
