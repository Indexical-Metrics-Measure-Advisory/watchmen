import {TopicArchivePolicy} from '@/services/data/tuples/topic-archive-types';
import {Page} from '@/services/data/types';
import {TopicArchiveCriteria} from './types';

export enum TopicArchiveEventTypes {
	SEARCHED = 'search',
}

export interface TopicArchiveEventBus {
	fire(type: TopicArchiveEventTypes.SEARCHED, criteria: TopicArchiveCriteria, policies: Page<TopicArchivePolicy>): this;
	on(type: TopicArchiveEventTypes.SEARCHED, listener: (criteria: TopicArchiveCriteria, policies: Page<TopicArchivePolicy>) => void): this;
	off(type: TopicArchiveEventTypes.SEARCHED, listener: (criteria: TopicArchiveCriteria, policies: Page<TopicArchivePolicy>) => void): this;
}
