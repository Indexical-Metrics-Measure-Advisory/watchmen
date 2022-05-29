import {TopicSnapshotFrequency} from '@/services/data/admin/topic-snapshot';
import {TopicId} from '@/services/data/tuples/topic-types';

export interface CriteriaState {
	topicId?: TopicId;
	frequency: Array<TopicSnapshotFrequency>;
}