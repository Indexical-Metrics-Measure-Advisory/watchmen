import {TopicSnapshotFrequency, TopicSnapshotScheduler} from '../../tuples/topic-snapshot-types';
import {TopicId} from '../../tuples/topic-types';
import {generateUuid, isFakedUuid} from '../../tuples/utils';
import {Page} from '../../types';
import {getCurrentTime} from '../../utils';
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
			frequency: frequencies[Math.floor(Math.random() * frequencies.length)],
			hour: 0,
			minute: 0,
			enabled: true,
			version: 1,
			createdAt: getCurrentTime(),
			lastModifiedAt: getCurrentTime()
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

let newSchedulerId = 10000;
export const saveMockTopicSnapshotScheduler = async (scheduler: TopicSnapshotScheduler): Promise<void> => {
	return new Promise<void>((resolve) => {
		if (isFakedUuid(scheduler)) {
			scheduler.schedulerId = `${newSchedulerId++}`;
		}
		setTimeout(() => resolve(), 500);
	});
};
