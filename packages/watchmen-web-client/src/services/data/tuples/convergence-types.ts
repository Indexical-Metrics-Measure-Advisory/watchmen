import {BucketId} from './bucket-types';
import {FactorId} from './factor-types';
import {IndicatorId} from './indicator-types';
import {SubjectDataSetColumnId} from './subject-types';
import {TenantId} from './tenant-types';
import {OptimisticLock, Tuple, TupleHolder} from './tuple-types';
import {UserGroupHolder} from './user-group-types';

export type ConvergenceId = string;

export enum ConvergenceParameterType {
	REFER = 'refer',
	CONSTANT = 'constant',
	COMPUTED = 'computed',
	// only available on factor indicator filter
	BUCKET = 'bucket',
	TIME_FRAME = 'time-frame'
}

export interface ConvergenceParameter {
	kind: ConvergenceParameterType;
}

export type ConvergenceFactorName = string;
export type ConvergenceFactorId = string;
export type ConvergenceTargetId = string;

/**
 * it's a multiple purposes object.
 * when it is used in factor/target formula, {@link #uuid} should refer to another convergence factor.
 * and when it is used in factor filter, {@link #uuid} should refer to factor from topic or column from subject dataset.
 */
export interface ReferConvergenceParameter extends ConvergenceParameter {
	kind: ConvergenceParameterType.REFER;
	uuid: ConvergenceFactorId | FactorId | SubjectDataSetColumnId;
}

export interface ConstantConvergenceParameter extends ConvergenceParameter {
	kind: ConvergenceParameterType.CONSTANT;
	value: string;
}

export enum ConvergenceFormulaOperator {
	NONE = 'none',
	ADD = 'add',
	SUBTRACT = 'subtract',
	MULTIPLY = 'multiply',
	DIVIDE = 'divide',
	MODULUS = 'modulus',
	YEAR_OF = 'year-of',
	HALF_YEAR_OF = 'half-year-of',
	QUARTER_OF = 'quarter-of',
	MONTH_OF = 'month-of',
	WEEK_OF_YEAR = 'week-of-year',
	WEEK_OF_MONTH = 'week-of-month',
	DAY_OF_MONTH = 'day-of-month',
	DAY_OF_WEEK = 'day-of-week',

	ROUND = 'round',
	FLOOR = 'floor',
	CEIL = 'ceil',
	ABS = 'abs',
	MAX = 'max',
	MIN = 'min',
	INTERPOLATE = 'interpolate',

	CASE_THEN = 'case-then',
}

export interface ComputedConvergenceParameter extends ConvergenceParameter {
	kind: ConvergenceParameterType.COMPUTED;
	operator: ConvergenceFormulaOperator;
	parameters: Array<ConvergenceParameter>;
}

export interface BucketConvergenceParameter extends ConvergenceParameter {
	kind: ConvergenceParameterType.BUCKET;
	bucketId: BucketId;
	segmentName: string;
}

export interface TimeFrameConvergenceParameter extends ConvergenceParameter {
	kind: ConvergenceParameterType.TIME_FRAME;
}

export enum ConvergenceParameterJointType {
	AND = 'and',
	OR = 'or',
}

export interface ConvergenceParameterCondition {
}

export enum ConvergenceParameterExpressionOperator {
	EMPTY = 'empty',
	NOT_EMPTY = 'not-empty',
	EQUALS = 'equals',
	NOT_EQUALS = 'not-equals',
	LESS = 'less',
	LESS_EQUALS = 'less-equals',
	MORE = 'more',
	MORE_EQUALS = 'more-equals',
	IN = 'in',
	NOT_IN = 'not-in',
}

export interface ConvergenceParameterExpression extends ConvergenceParameterCondition {
	left: ConvergenceParameter;
	operator: ConvergenceParameterExpressionOperator;
	right: ConvergenceParameter;
}

export interface ConvergenceParameterJoint extends ConvergenceParameterCondition {
	conj: ConvergenceParameterJointType;
	filters: Array<ConvergenceParameterCondition>;
}

export interface ConditionalConvergenceParameter extends ConvergenceParameter {
	on?: ConvergenceParameterJoint;
	conditional: boolean;
}

export interface CaseThenConvergenceParameter extends ComputedConvergenceParameter {
	operator: ConvergenceFormulaOperator.CASE_THEN;
	parameters: Array<ConditionalConvergenceParameter>;
}

export enum ConvergenceTargetBetterSide {
	LESS = 'less',
	MORE = 'more'
}

export interface ConvergenceTarget {
	uuid: ConvergenceTargetId;
	name: string;
	/** to be value, should be a numeric value, a percentage value */
	tobe?: string;
	/** as is formula */
	asis?: ComputedConvergenceParameter | ConvergenceFactorId;
	/** which side is better, with computed as is value vs to be value. */
	betterSide?: ConvergenceTargetBetterSide;
	/** this July vs this June if time frame is on month, month-on-month */
	askPreviousCycle?: boolean;
	/** this July vs last July if time frame is on month, year-on-year */
	askChainCycle?: boolean;
}

export enum ConvergenceTimeFrameKind {
	NONE = 'none',
	YEAR = 'year',
	HALF_YEAR = 'half-year',
	QUARTER = 'quarter',
	MONTH = 'month',
	WEEK_OF_YEAR = 'week-of-year',
	DAY_OF_MONTH = 'day-of-month',
	DAY_OF_WEEK = 'day-of-week',
	LAST_N_YEARS = 'last-n-years',
	LAST_N_MONTHS = 'last-n-months',
	LAST_N_WEEKS = 'last-n-weeks',
	LAST_N_DAYS = 'last-n-days'
}

export enum ConvergenceTimeFrameTill {
	NOW = 'now',
	LAST_COMPLETE_CYCLE = 'last-complete-cycle',
	SPECIFIED = 'specified'
}

export interface ConvergenceTimeFrame {
	/** is target in time frame, normally is */
	kind?: ConvergenceTimeFrameKind;
	/** only available if kind is LAST_N-* types, should be a positive value */
	lastN?: string;
	/** time frame is cut off till when */
	till?: ConvergenceTimeFrameTill;
	/** specify the till time when till is SPECIFIED */
	specifiedTill?: string;
}

export enum ConvergenceVariableKind {
	SINGLE_VALUE = 'value',
	BUCKET = 'bucket',
	RANGE = 'range'
}

export interface ConvergenceVariable {
	name: string;
	kind: ConvergenceVariableKind;
}

export interface ConvergenceVariableOnValue extends ConvergenceVariable {
	kind: ConvergenceVariableKind.SINGLE_VALUE;
	value?: string;
}

export interface ConvergenceVariableOnBucket extends ConvergenceVariable {
	kind: ConvergenceVariableKind.BUCKET;
	bucketId?: BucketId;
	segmentName?: string;
}

export interface ConvergenceVariableOnRange extends ConvergenceVariable {
	kind: ConvergenceVariableKind.RANGE;
	min?: string;
	includeMin?: boolean;
	max?: string;
	includeMax?: boolean;
}

export enum ConvergenceFactorKind {
	INDICATOR = 'indicator',
	COMPUTED = 'computed'
}

export interface ConvergenceFactor {
	uuid: ConvergenceFactorId;
	kind: ConvergenceFactorKind;
	name: ConvergenceFactorName;
	formula?: ComputedConvergenceParameter;
}

export interface ConvergenceFactorOnIndicator extends ConvergenceFactor {
	kind: ConvergenceFactorKind.INDICATOR;
	indicatorId?: IndicatorId;
	conditional: boolean;
	/** convergence variables are available in constant value */
	filter?: ConvergenceParameterJoint;
}

export interface ConvergenceFactorOnComputation extends ConvergenceFactor {
	kind: ConvergenceFactorKind.COMPUTED;
}

export interface Convergence extends Tuple, OptimisticLock, UserGroupHolder {
	convergenceId: ConvergenceId;
	name: string;
	description?: string;
	timeFrame?: ConvergenceTimeFrame;
	targets?: Array<ConvergenceTarget>;
	variables?: Array<ConvergenceVariable>;
	tenantId?: TenantId;
}

export interface ConvergenceTargetValues {
	uuid: ConvergenceTargetId;
	currentValue?: number;
	previousValue?: number;
	chainValue?: number;
	failed: boolean;
}

export interface ConvergenceFactorValues {
	uuid: ConvergenceFactorId;
	currentValue?: number;
	previousValue?: number;
	chainValue?: number;
	failed: boolean;
}

export interface ConvergenceValues {
	targets: Array<ConvergenceTargetValues>;
	factors: Array<ConvergenceFactorValues>;
}

export interface ConvergenceHolder extends TupleHolder {
	convergenceIds: Array<ConvergenceId>;
}