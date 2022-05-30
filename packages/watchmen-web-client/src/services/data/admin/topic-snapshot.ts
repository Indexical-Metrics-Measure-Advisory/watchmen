import {findAccount} from '../account';
import {Apis, post} from '../apis';
import {fetchMockTopicSnapshotSchedulers, saveMockTopicSnapshotScheduler} from '../mock/admin/mock-topic-snapshot';
import {TopicSnapshotFrequency, TopicSnapshotScheduler} from '../tuples/topic-snapshot-types';
import {TopicId} from '../tuples/topic-types';
import {isFakedUuid} from '../tuples/utils';
import {Page} from '../types';
import {isMockService} from '../utils';

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

export const saveTopicSnapshotScheduler = async (scheduler: TopicSnapshotScheduler): Promise<void> => {
	scheduler.tenantId = findAccount()?.tenantId;
	if (isMockService()) {
		return saveMockTopicSnapshotScheduler(scheduler);
	} else if (isFakedUuid(scheduler)) {
		const data = await post({api: Apis.TOPIC_SNAPSHOT_SCHEDULER_SAVE, data: scheduler});
		scheduler.schedulerId = data.schedulerId;
		scheduler.version = data.version;
		scheduler.tenantId = data.tenantId;
		scheduler.lastModifiedAt = data.lastModifiedAt;
	} else {
		const data = await post({api: Apis.TOPIC_SNAPSHOT_SCHEDULER_SAVE, data: scheduler});
		scheduler.version = data.version;
		scheduler.tenantId = data.tenantId;
		scheduler.lastModifiedAt = data.lastModifiedAt;
	}
};