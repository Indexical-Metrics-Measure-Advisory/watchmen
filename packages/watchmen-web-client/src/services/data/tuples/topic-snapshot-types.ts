import {ParameterJoint} from './factor-calculator-types';
import {PipelineId} from './pipeline-types';
import {TenantId} from './tenant-types';
import {TopicId} from './topic-types';
import {OptimisticLock, Tuple} from './tuple-types';

export enum TopicSnapshotFrequency {
	MONTHLY = 'monthly',
	WEEKLY = 'weekly',
	DAILY = 'daily'
}

export type TopicSnapshotSchedulerId = string;

export interface TopicSnapshotScheduler extends Tuple, OptimisticLock {
	schedulerId: TopicSnapshotSchedulerId;
	topicId: TopicId;
	targetTopicName?: string;
	targetTopicId?: TopicId;
	pipelineId?: PipelineId;
	frequency: TopicSnapshotFrequency;
	filter?: ParameterJoint;
	// only for weekly
	weekday?: string;
	// only for monthly
	day?: string;
	hour: number;
	minute: number;
	enabled: boolean;
	tenantId?: TenantId;
}