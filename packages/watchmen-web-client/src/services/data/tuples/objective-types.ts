import {BucketId} from './bucket-types';
import {ParameterJoint} from './factor-calculator-types';
import {IndicatorId} from './indicator-types';
import {TenantId} from './tenant-types';
import {OptimisticLock, Tuple} from './tuple-types';
import {UserGroupHolder} from './user-group-types';

export type ObjectiveId = string;

export enum ObjectiveParameterType {
	REFER = 'refer',
	CONSTANT = 'constant',
	COMPUTED = 'computed'
}

export interface ObjectiveParameter {
	kind: ObjectiveParameterType;
}

export type ObjectiveFactorName = string;
export type ObjectiveFactorId = string;

export interface ReferObjectiveParameter extends ObjectiveParameter {
	kind: ObjectiveParameterType.REFER;
	uuid: ObjectiveFactorId;
}

export interface ConstantObjectiveParameter extends ObjectiveParameter {
	kind: ObjectiveParameterType.CONSTANT;
	value: string;
}

export enum ObjectiveFormulaOperator {
	ADD = 'add',
	SUBTRACT = 'subtract',
	MULTIPLY = 'multiply',
	DIVIDE = 'divide',

	ROUND = 'round',
	FLOOR = 'floor',
	CEIL = 'ceil',
	ABS = 'abs',
	SQRT = 'sqrt',
	POW = 'pow',

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

export enum ObjectiveTargetBetterSide {
	LESS = 'less',
	MORE = 'more'
}

export interface ObjectiveTarget {
	name: string;
	/** to be value, should be a numeric value, a percentage value */
	tobe?: string;
	/** as is formula */
	asis?: ComputedObjectiveParameter;
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
	factorId: ObjectiveFactorId;
	kind: ObjectiveFactorKind;
	name: ObjectiveFactorName;
	formula?: ComputedObjectiveParameter;
}

export interface ObjectiveFactorOnIndicator extends ObjectiveFactor {
	kind: ObjectiveFactorKind.INDICATOR;
	indicatorId?: IndicatorId;
	/** objective variables are available in constant value */
	filter?: ParameterJoint;
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
