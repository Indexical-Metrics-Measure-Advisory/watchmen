import {findAccount} from '../account';
import {Apis, get, page, post} from '../apis';
import {
	askMockSynonymFactors,
	fetchMockTopic,
	fetchMockTopicDataIds,
	fetchMockTopicRowCount,
	listMockTopics,
	listMockTopicsForHolder,
	mockRerunTopic,
	saveMockTopic
} from '../mock/tuples/mock-topic';
import {TuplePage} from '../query/tuple-page';
import {Page, RowOfAny} from '../types';
import {isMockService} from '../utils';
import {DataSourceId} from './data-source-types';
import {ParameterJoint} from './factor-calculator-types';
import {Factor} from './factor-types';
import {PipelineId} from './pipeline-types';
import {QueryTopic, QueryTopicForHolder} from './query-topic-types';
import {Topic, TopicId} from './topic-types';
import {isFakedUuid} from './utils';

export const listTopics = async (options: {
	search: string;
	pageNumber?: number;
	pageSize?: number;
}): Promise<TuplePage<QueryTopic>> => {
	const {search = '', pageNumber = 1, pageSize = 9} = options;

	if (isMockService()) {
		return listMockTopics(options);
	} else {
		return await page({api: Apis.TOPIC_LIST_BY_NAME, search: {search}, pageable: {pageNumber, pageSize}});
	}
};

export const fetchTopic = async (topicId: TopicId): Promise<{ topic: Topic }> => {
	if (isMockService()) {
		return fetchMockTopic(topicId);
	} else {
		const topic = await get({api: Apis.TOPIC_GET, search: {topicId}});
		return {topic};
	}
};

export const saveTopic = async (topic: Topic): Promise<void> => {
	topic.tenantId = findAccount()?.tenantId;
	if (isMockService()) {
		return saveMockTopic(topic);
	} else if (isFakedUuid(topic)) {
		const data = await post({api: Apis.TOPIC_CREATE, data: topic});
		topic.topicId = data.topicId;
		topic.version = data.version;
		topic.tenantId = data.tenantId;
		topic.lastModifiedAt = data.lastModifiedAt;
	} else {
		const data = await post({api: Apis.TOPIC_SAVE, data: topic});
		topic.version = data.version;
		topic.tenantId = data.tenantId;
		topic.lastModifiedAt = data.lastModifiedAt;
	}
};

export const listTopicsForHolderNonRaw = async (search: string): Promise<Array<QueryTopicForHolder>> => {
	if (isMockService()) {
		return listMockTopicsForHolder(search);
	} else {
		return await get({api: Apis.TOPIC_LIST_FOR_HOLDER_BY_NAME_NON_RAW, search: {search}});
	}
};

export const fetchTopicRowCount = async (topicId: TopicId, condition?: ParameterJoint): Promise<number> => {
	if (isMockService()) {
		return fetchMockTopicRowCount(topicId, condition);
	} else {
		return await post({api: Apis.TOPIC_ROW_COUNT, search: {topicId}, data: condition});
	}
};

export const fetchTopicDataIds = async (topicId: TopicId, condition?: ParameterJoint): Promise<Array<string>> => {
	if (isMockService()) {
		return fetchMockTopicDataIds(topicId, condition);
	} else {
		return await post({api: Apis.TOPIC_DATA_IDS, search: {topicId}, data: condition});
	}
};

export const fetchTopicData = async (topicId: TopicId, pageNumber: number, pageSize: number): Promise<Page<RowOfAny>> => {
	if (isMockService()) {
		return {
			pageNumber,
			pageSize,
			itemCount: 0,
			pageCount: 0,
			data: []
		};
	} else {
		return await post({
			api: Apis.TOPIC_DATA,
			search: {topicId},
			data: {pageNumber, pageSize, topicId}
		});
	}
};

export const rerunTopic = async (topicId: TopicId, pipelineId: PipelineId, dataId: string): Promise<void> => {
	if (isMockService()) {
		return await mockRerunTopic(topicId, pipelineId, dataId);
	} else {
		return await get({api: Apis.TOPIC_RERUN, search: {topicId, pipelineId, dataId}});
	}
};

export const importTopics = async (topics: Array<Topic>): Promise<Array<Topic>> => {
	if (isMockService()) {
		topics.forEach(saveMockTopic);
		return topics;
	} else {
		return await post({api: Apis.IMPORT_TOPICS, data: topics});
	}
};

export const askSynonymFactors = async (topicName: string, dataSourceId: DataSourceId): Promise<Array<Factor>> => {
	if (isMockService()) {
		return await askMockSynonymFactors(topicName, dataSourceId);
	} else {
		return await get({api: Apis.TOPIC_SYNONYM_ASK_FACTORS, search: {topicName, dataSourceId}});
	}
};

export const importTopicData = async (topicId: TopicId, data: Array<any>): Promise<void> => {
	if (isMockService()) {
		console.log(data);
	} else {
		return await post({api: Apis.TOPIC_IMPORT_DATA, search: {topicId}, data});
	}
};