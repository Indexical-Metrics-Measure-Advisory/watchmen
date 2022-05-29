import {Apis, post} from '../apis';
import {fetchMockTopicSnapshotSchedulers} from '../mock/admin/mock-topic-snapshot';
import {TopicId} from '../tuples/topic-types';
import {Page} from '../types';
import {isMockService} from '../utils';
import {TopicSnapshotFrequency, TopicSnapshotScheduler} from './topic-snapshot-types';

export const fetchTopicSnapshotSchedulers = async (
	topicId?: TopicId, frequency?: Array<TopicSnapshotFrequency>, pageNumber?: number, pageSize?: number): Promise<Page<TopicSnapshotScheduler>> => {
	if (isMockService()) {
		return await fetchMockTopicSnapshotSchedulers(topicId, frequency, pageNumber, pageSize);
	} else {
		return await post({
			api: Apis.TOPIC_SNAPSHOT_SCHEDULER_LIST,
			data: {topicId, frequency, pageNumber: pageNumber ?? 1, pageSize: pageSize ?? 10}
		});
	}
};