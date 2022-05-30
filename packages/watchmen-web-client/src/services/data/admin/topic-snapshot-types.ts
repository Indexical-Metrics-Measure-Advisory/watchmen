import {OptimisticLock, Tuple} from '@/services/data/tuples/tuple-types';
import {ParameterJoint} from '../tuples/factor-calculator-types';
import {TopicId} from '../tuples/topic-types';

export enum TopicSnapshotFrequency {
	MONTHLY = 'monthly',
	WEEKLY = 'weekly',
	DAILY = 'daily'
}

export type TopicSnapshotSchedulerId = string;

export interface TopicSnapshotScheduler extends Tuple, OptimisticLock {
	schedulerId: TopicSnapshotSchedulerId;
	topicId: TopicId;
	frequency: TopicSnapshotFrequency;
	filter?: ParameterJoint;
	// only for weekly
	weekday?: string;
	// only for monthly
	day?: string;
	hour: number;
	minute: number;
	enabled: boolean;
}