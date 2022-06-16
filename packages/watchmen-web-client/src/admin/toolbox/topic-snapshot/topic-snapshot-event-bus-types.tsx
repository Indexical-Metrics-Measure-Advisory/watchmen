import {TopicSnapshotScheduler} from '@/services/data/tuples/topic-snapshot-types';
import {Page} from '@/services/data/types';
import {TopicSnapshotCriteria} from './types';

export enum TopicSnapshotEventTypes {
	SEARCHED = 'search',
}

export interface TopicSnapshotEventBus {
	fire(type: TopicSnapshotEventTypes.SEARCHED, criteria: TopicSnapshotCriteria, schedulers: Page<TopicSnapshotScheduler>): this;
	on(type: TopicSnapshotEventTypes.SEARCHED, listener: (criteria: TopicSnapshotCriteria, schedulers: Page<TopicSnapshotScheduler>) => void): this;
	off(type: TopicSnapshotEventTypes.SEARCHED, listener: (criteria: TopicSnapshotCriteria, schedulers: Page<TopicSnapshotScheduler>) => void): this;
}