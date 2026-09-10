import {findAccount} from '../account';
import {Apis, del, post} from '../apis';
import {fetchMockTopicArchivePolicies, runMockTopicArchive, saveMockTopicArchivePolicy} from '../mock/admin/mock-topic-archive';
import {TopicArchivePolicy, TopicArchiveResult} from '../tuples/topic-archive-types';
import {TopicId} from '../tuples/topic-types';
import {Page} from '../types';
import {isMockService} from '../utils';

export const fetchTopicArchivePolicies = async (
	topicId?: TopicId, pageNumber?: number, pageSize?: number): Promise<Page<TopicArchivePolicy>> => {
	if (isMockService()) {
		return await fetchMockTopicArchivePolicies(topicId, pageNumber, pageSize);
	} else {
		return await post({
			api: Apis.TOPIC_ARCHIVE_POLICY_LIST,
			data: {topicId, pageNumber: pageNumber ?? 1, pageSize: pageSize ?? 10}
		});
	}
};

export const saveTopicArchivePolicy = async (policy: TopicArchivePolicy): Promise<void> => {
	policy.tenantId = findAccount()?.tenantId;
	if (isMockService()) {
		return saveMockTopicArchivePolicy(policy);
	} else {
		const data = await post({api: Apis.TOPIC_ARCHIVE_POLICY_SAVE, data: policy});
		policy.policyId = data.policyId;
		policy.version = data.version;
		policy.tenantId = data.tenantId;
		policy.lastModifiedAt = data.lastModifiedAt;
	}
};

export const deleteTopicArchivePolicy = async (policy: TopicArchivePolicy): Promise<void> => {
	if (isMockService()) {
		return;
	} else {
		return await del({api: Apis.TOPIC_ARCHIVE_POLICY_DELETE, search: {policyId: policy.policyId}});
	}
};

export const runTopicArchive = async (
	policy: TopicArchivePolicy, dryRun: boolean, maxBatches: number = 10): Promise<TopicArchiveResult> => {
	if (isMockService()) {
		return runMockTopicArchive(policy, dryRun);
	} else {
		return await post({
			api: Apis.TOPIC_ARCHIVE_RUN,
			data: {
				topicId: policy.topicId, policyId: policy.policyId,
				dryRun, maxBatches
			}
		});
	}
};
