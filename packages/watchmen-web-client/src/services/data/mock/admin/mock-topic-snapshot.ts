import {TopicSnapshotFrequency, TopicSnapshotScheduler} from '../../admin/topic-snapshot-types';
import {TopicId} from '../../tuples/topic-types';
import {generateUuid} from '../../tuples/utils';
import {Page} from '../../types';
import {DemoTopics} from '../tuples/mock-data-topics';

export const fetchMockTopicSnapshotSchedulers = async (
	topicId?: TopicId, frequency?: Array<TopicSnapshotFrequency>, pageNumber?: number, pageSize?: number
): Promise<Page<TopicSnapshotScheduler>> => {
	const topicIds = topicId == null ? DemoTopics.map(topic => topic.topicId) : [topicId];
	const frequencies = frequency == null || frequency.length === 0 ? [TopicSnapshotFrequency.MONTHLY, TopicSnapshotFrequency.WEEKLY, TopicSnapshotFrequency.DAILY] : frequency;

	const count = pageNumber === 3 ? Math.floor(Math.random() * 10) : 10;
	const items = new Array(count).fill(1).map(() => {
		return {
			schedulerId: generateUuid(),
			topicId: topicIds[Math.floor(Math.random() * topicIds.length)],
			frequency: frequencies[Math.floor(Math.random() * frequencies.length)]
		};
	});

	return new Promise<Page<TopicSnapshotScheduler>>(resolve => {
		setTimeout(() => {
			resolve({
				data: items,
				pageCount: 3,
				pageSize: pageSize ?? 10,
				pageNumber: pageNumber ?? 1,
				itemCount: (pageNumber ?? 1 - 1) * (pageSize ?? 10) + items.length
			});
		}, 500);
	});
};