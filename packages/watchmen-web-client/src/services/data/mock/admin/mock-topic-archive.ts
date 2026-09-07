import {TopicArchivePolicy, TopicArchiveResult} from '../../tuples/topic-archive-types';
import {TopicId} from '../../tuples/topic-types';
import {generateUuid, isFakedUuid} from '../../tuples/utils';
import {Page} from '../../types';
import {getCurrentTime} from '../../utils';
import {DemoTopics} from '../tuples/mock-data-topics';

export const fetchMockTopicArchivePolicies = async (
	topicId?: TopicId, pageNumber?: number, pageSize?: number
): Promise<Page<TopicArchivePolicy>> => {
	const topicIds = topicId == null ? DemoTopics.map(topic => topic.topicId) : [topicId];

	const count = pageNumber === 3 ? Math.floor(Math.random() * 10) : 10;
	const items = new Array(count).fill(1).map(() => {
		return {
			policyId: generateUuid(),
			topicId: topicIds[Math.floor(Math.random() * topicIds.length)],
			enabled: true,
			hotDays: 90,
			coldDays: null,
			archiveDataSourceId: generateUuid(),
			batchSize: 5000,
			destroyRequiresApproval: true,
			version: 1,
			createdAt: getCurrentTime(),
			lastModifiedAt: getCurrentTime()
		};
	});

	return new Promise<Page<TopicArchivePolicy>>(resolve => {
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

let newPolicyId = 20000;
export const saveMockTopicArchivePolicy = async (policy: TopicArchivePolicy): Promise<void> => {
	return new Promise<void>((resolve) => {
		if (isFakedUuid(policy)) {
			policy.policyId = `${newPolicyId++}`;
		}
		setTimeout(() => resolve(), 500);
	});
};

export const runMockTopicArchive = async (policy: TopicArchivePolicy, dryRun: boolean): Promise<TopicArchiveResult> => {
	return new Promise<TopicArchiveResult>(resolve => {
		setTimeout(() => {
			const totalRows = Math.floor(Math.random() * 10000);
			resolve({
				topicId: policy.topicId,
				dryRun,
				totalRows,
				plannedBatches: Math.ceil(totalRows / policy.batchSize),
				batches: dryRun ? [] : []
			});
		}, 500);
	});
};
