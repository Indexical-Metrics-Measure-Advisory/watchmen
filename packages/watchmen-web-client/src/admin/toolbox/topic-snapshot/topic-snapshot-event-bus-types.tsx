import {TopicSnapshotScheduler} from '@/services/data/admin/topic-snapshot-types';
import {Page} from '@/services/data/types';

export enum TopicSnapshotEventTypes {
	SEARCHED = 'search',
}

export interface TopicSnapshotEventBus {
	fire(type: TopicSnapshotEventTypes.SEARCHED, schedulers: Page<TopicSnapshotScheduler>): this;
	on(type: TopicSnapshotEventTypes.SEARCHED, listener: (schedulers: Page<TopicSnapshotScheduler>) => void): this;
	off(type: TopicSnapshotEventTypes.SEARCHED, listener: (schedulers: Page<TopicSnapshotScheduler>) => void): this;
}