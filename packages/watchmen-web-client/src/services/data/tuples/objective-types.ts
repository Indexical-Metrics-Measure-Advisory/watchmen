import {BucketId} from './bucket-types';
import {FactorId} from './factor-types';
import {IndicatorId} from './indicator-types';
import {SubjectDataSetColumnId} from './subject-types';
import {TenantId} from './tenant-types';
import {OptimisticLock, Tuple, TupleHolder} from './tuple-types';
import {UserGroupHolder} from './user-group-types';

export type ObjectiveId = string;

export enum ObjectiveParameterType {
	REFER = 'refer',
	CONSTANT = 'constant',
	COMPUTED = 'computed',
	// only available on factor indicator filter
	BUCKET = 'bucket',
	TIME_FRAME = 'time-frame'
}

export interface ObjectiveParameter {
	kind: ObjectiveParameterType;
}

export type ObjectiveFactorName = string;
export type ObjectiveFactorId = string;
export type ObjectiveTargetId = string;

/**
 * it's a multiple purposes object.
 * when it is used in factor/target formula, {@link #uuid} should refer to another objective factor.
 * and when it is used in factor filter, {@link #uuid} should refer to factor from topic or column from subject dataset.
 */
export interface ReferObjectiveParameter extends ObjectiveParameter {
	kind: ObjectiveParameterType.REFER;
	uuid: ObjectiveFactorId | FactorId | SubjectDataSetColumnId;
}

export interface ConstantObjectiveParameter extends ObjectiveParameter {
	kind: ObjectiveParameterType.CONSTANT;
	value: string;
}

export enum ObjectiveFormulaOperator {
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

export interface ComputedObjectiveParameter extends ObjectiveParameter {
	kind: ObjectiveParameterType.COMPUTED;
	operator: ObjectiveFormulaOperator;
	parameters: Array<ObjectiveParameter>;
}

export interface BucketObjectiveParameter extends ObjectiveParameter {
	kind: ObjectiveParameterType.BUCKET;
	bucketId: BucketId;
	segmentName: string;
}

export interface TimeFrameObjectiveParameter extends ObjectiveParameter {
	kind: ObjectiveParameterType.TIME_FRAME;
}

export enum ObjectiveParameterJointType {
	AND = 'and',
	OR = 'or',
}

export interface ObjectiveParameterCondition {
}

export enum ObjectiveParameterExpressionOperator {
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

export interface ObjectiveParameterExpression extends ObjectiveParameterCondition {
	left: ObjectiveParameter;
	operator: ObjectiveParameterExpressionOperator;
	right: ObjectiveParameter;
}

export interface ObjectiveParameterJoint extends ObjectiveParameterCondition {
	conj: ObjectiveParameterJointType;
	filters: Array<ObjectiveParameterCondition>;
}

export interface ConditionalObjectiveParameter extends ObjectiveParameter {
	on?: ObjectiveParameterJoint;
	conditional: boolean;
}

export interface CaseThenObjectiveParameter extends ComputedObjectiveParameter {
	operator: ObjectiveFormulaOperator.CASE_THEN;
	parameters: Array<ConditionalObjectiveParameter>;
}

export enum ObjectiveTargetBetterSide {
	LESS = 'less',
	MORE = 'more'
}

export interface ObjectiveTarget {
	uuid: ObjectiveTargetId;
	name: string;
	/** to be value, should be a numeric value, a percentage value */
	tobe?: string;
	/** as is formula */
	asis?: ComputedObjectiveParameter | ObjectiveFactorId;
	/** which side is better, with computed as is value vs to be value. */
	betterSide?: ObjectiveTargetBetterSide;
	/** this July vs this June if time frame is on month, month-on-month */
	askPreviousCycle?: boolean;
	/** this July vs last July if time frame is on month, year-on-year */
	askChainCycle?: boolean;
}

export enum ObjectiveTimeFrameKind {
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

export enum ObjectiveTimeFrameTill {
	NOW = 'now',
	LAST_COMPLETE_CYCLE = 'last-complete-cycle',
	SPECIFIED = 'specified'
}

export interface ObjectiveTimeFrame {
	/** is target in time frame, normally is */
	kind?: ObjectiveTimeFrameKind;
	/** only available if kind is LAST_N-* types, should be a positive value */
	lastN?: string;
	/** time frame is cut off till when */
	till?: ObjectiveTimeFrameTill;
	/** specify the till time when till is SPECIFIED */
	specifiedTill?: string;
}

export enum ObjectiveVariableKind {
	SINGLE_VALUE = 'value',
	BUCKET = 'bucket',
	RANGE = 'range'
}

export interface ObjectiveVariable {
	name: string;
	kind: ObjectiveVariableKind;
}

export interface ObjectiveVariableOnValue extends ObjectiveVariable {
	kind: ObjectiveVariableKind.SINGLE_VALUE;
	value?: string;
}

export interface ObjectiveVariableOnBucket extends ObjectiveVariable {
	kind: ObjectiveVariableKind.BUCKET;
	bucketId?: BucketId;
	segmentName?: string;
}

export interface ObjectiveVariableOnRange extends ObjectiveVariable {
	kind: ObjectiveVariableKind.RANGE;
	min?: string;
	includeMin?: boolean;
	max?: string;
	includeMax?: boolean;
}

export enum ObjectiveFactorKind {
	INDICATOR = 'indicator',
	COMPUTED = 'computed'
}

export interface ObjectiveFactor {
	uuid: ObjectiveFactorId;
	kind: ObjectiveFactorKind;
	name: ObjectiveFactorName;
	formula?: ComputedObjectiveParameter;
}

export interface ObjectiveFactorOnIndicator extends ObjectiveFactor {
	kind: ObjectiveFactorKind.INDICATOR;
	indicatorId?: IndicatorId;
	conditional: boolean;
	/** objective variables are available in constant value */
	filter?: ObjectiveParameterJoint;
}

export interface ObjectiveFactorOnComputation extends ObjectiveFactor {
	kind: ObjectiveFactorKind.COMPUTED;
}

export interface Objective extends Tuple, OptimisticLock, UserGroupHolder {
	objectiveId: ObjectiveId;
	name: string;
	description?: string;
	timeFrame?: ObjectiveTimeFrame;
	targets?: Array<ObjectiveTarget>;
	variables?: Array<ObjectiveVariable>;
	factors?: Array<ObjectiveFactor>;
	tenantId?: TenantId;
}

export interface ObjectiveTargetValues {
	uuid: ObjectiveTargetId;
	currentValue?: number;
	previousValue?: number;
	chainValue?: number;
	failed: boolean;
}

export interface ObjectiveFactorValues {
	uuid: ObjectiveFactorId;
	currentValue?: number;
	previousValue?: number;
	chainValue?: number;
	failed: boolean;
}

export interface ObjectiveValues {
	targets: Array<ObjectiveTargetValues>;
	factors: Array<ObjectiveFactorValues>;
}

export interface ObjectiveHolder extends TupleHolder {
	objectiveIds: Array<ObjectiveId>;
}