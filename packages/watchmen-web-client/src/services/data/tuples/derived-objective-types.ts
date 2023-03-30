import {DateTime} from '../types';
import {BucketId} from './bucket-types';
import {FactorId} from './factor-types';
import {MeasureMethod} from './indicator-types';
import {Objective, ObjectiveId, ObjectiveTargetId} from './objective-types';
import {SubjectDataSetColumnId} from './subject-types';
import {Tuple} from './tuple-types';

export type DerivedObjectiveId = string;
export type BreakdownTargetId = string;

export enum BreakdownDimensionType {
	/**
	 * factor or column could be as nature classified dimension, which is by its original value
	 * such as enum factor
	 */
	VALUE = 'value',
	/**
	 * factor or column could be classified by buckets.
	 * bucket might be detected by special factor or column type, or just simple numeric value
	 */
	BUCKET = 'bucket',
	/**
	 * factor or column could be classified on date or time perspective
	 */
	TIME_RELATED = 'time'
}

export interface BreakdownDimension {
	// when type is VALUE, which means no bucket, no time measure method. use the original value as dimension
	type: BreakdownDimensionType;
	// if measure on factor, factor id must be given
	factorOrColumnId: FactorId | SubjectDataSetColumnId;
	// bucket for any measure on type
	bucketId?: BucketId;
	// only when factor/column is date, and adaptable time measure method could be applied
	// for example, if factor is date, then YEAR/QUARTER/MONTH/etc. could be applied to it
	// if factor is year, then only YEAR could be applied to it.
	timeMeasureMethod?: MeasureMethod;
}

export interface BreakdownTarget {
	uuid: BreakdownTargetId;
	targetId: ObjectiveTargetId;
	name: string;
	dimensions: Array<BreakdownDimension>;
}

export interface DerivedObjective extends Tuple {
	derivedObjectiveId: DerivedObjectiveId;
	name: string;
	description?: string;
	objectiveId: ObjectiveId;
	definition: Objective;
	breakdownTargets: Array<BreakdownTarget>;
	lastVisitTime: DateTime;
}

export interface ObjectiveTargetBreakdownValueRow {
	dimensions: Array<string | number | true | null | undefined>;
	currentValue?: number;
	previousValue?: number;
	chainValue?: number;
}

export interface ObjectiveTargetBreakdownValues {
	breakdownUuid: BreakdownTargetId;
	data: Array<ObjectiveTargetBreakdownValueRow>;
	failed: boolean;
}