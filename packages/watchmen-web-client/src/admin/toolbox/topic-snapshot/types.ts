import {TopicSnapshotFrequency} from '@/services/data/tuples/topic-snapshot-types';
import {TopicId} from '@/services/data/tuples/topic-types';

export interface CriteriaState {
	topicId?: TopicId;
	frequency: Array<TopicSnapshotFrequency>;
}

export interface TopicSnapshotCriteria extends CriteriaState {
	pageNumber?: number;
	pageSize?: number;
}