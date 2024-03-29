import {DateTime} from '../types';
import {BucketId} from './bucket-types';
import {ObjectiveId, ObjectiveTargetId} from './objective-types';
import {TenantId} from './tenant-types';
import {OptimisticLock, Tuple, TupleHolder} from './tuple-types';
import {UserGroupHolder} from './user-group-types';

export type ConvergenceId = string;
export type ConvergenceVariableId = string;
export type ConvergenceTargetVariableMappingId = string;
export type ConvergenceTargetId = string;

export enum ConvergenceVariableType {
	TIMEFRAME = 'timeframe',
	BUCKET = 'bucket',
	FREE_WALK = 'free-walk'
}

export enum ConvergenceVariableAxis {
	X = 'x', Y = 'y'
}

export interface ConvergenceVariable {
	uuid: ConvergenceVariableId;
	type: ConvergenceVariableType;
	name?: string;
	axis: ConvergenceVariableAxis;
}

export enum ConvergenceTimeFrameVariableKind {
	YEAR = 'year',
	HALF_YEAR = 'half-year',
	QUARTER = 'quarter',
	MONTH = 'month',
	WEEK = 'week',
	DAY = 'day'
}

export interface TimeFrameConvergenceVariableValue {
	start: DateTime;
	end: DateTime;
}

export interface ConvergenceTimeFrameVariable extends ConvergenceVariable {
	type: ConvergenceVariableType.TIMEFRAME;
	/** use kind and till to compute values */
	kind: ConvergenceTimeFrameVariableKind;
	till?: DateTime;
	times: number;
	values: Array<TimeFrameConvergenceVariableValue>;
}

export interface ConvergenceBucketVariable extends ConvergenceVariable {
	type: ConvergenceVariableType.BUCKET;
	bucketId: BucketId;
}

export interface ConvergenceFreeWalkVariable extends ConvergenceVariable {
	type: ConvergenceVariableType.FREE_WALK;
	values: Array<string>;
}

export type CONVERGENCE_TARGET_VARIABLE_MAPPING_IGNORED = '#';

export interface ConvergenceTargetVariableMapping {
	uuid: ConvergenceTargetVariableMappingId;
	objectiveVariableName: string;
	variableId?: ConvergenceVariableId | CONVERGENCE_TARGET_VARIABLE_MAPPING_IGNORED;
}

export interface ConvergenceTarget {
	uuid: ConvergenceTargetId;
	objectiveId: ObjectiveId;
	targetId: ObjectiveTargetId;
	useTimeFrame: boolean;
	mapping: Array<ConvergenceTargetVariableMapping>;
	/** starts from 0 */
	row: number;
	/** starts from 0 */
	col: number;
}

export interface Convergence extends Tuple, OptimisticLock, UserGroupHolder {
	convergenceId: ConvergenceId;
	name: string;
	description?: string;
	variables?: Array<ConvergenceVariable>;
	targets?: Array<ConvergenceTarget>;
	tenantId?: TenantId;
}

export interface ConvergenceHolder extends TupleHolder {
	convergenceIds: Array<ConvergenceId>;
}

export interface ConvergenceAxisSegment {
	name: string;
	segments?: Array<ConvergenceAxisSegment>;
}

export interface ConvergenceCellValue {
	row: number;
	col: number;
	value?: string;
	failed: boolean;
}

export interface ConvergenceData {
	xAxis: Array<ConvergenceAxisSegment>;
	yAxis: Array<ConvergenceAxisSegment>;
	values: Array<ConvergenceCellValue>;
}