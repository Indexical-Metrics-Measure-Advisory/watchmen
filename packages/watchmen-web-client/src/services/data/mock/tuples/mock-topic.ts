import {TuplePage} from '../../query/tuple-page';
import {DataSourceId} from '../../tuples/data-source-types';
import {ParameterJoint} from '../../tuples/factor-calculator-types';
import {Factor} from '../../tuples/factor-types';
import {PipelineId} from '../../tuples/pipeline-types';
import {QueryTopic, QueryTopicForHolder} from '../../tuples/query-topic-types';
import {Topic, TopicId, TopicKind, TopicType} from '../../tuples/topic-types';
import {isFakedUuid} from '../../tuples/utils';
import {getCurrentTime} from '../../utils';
import {DemoQueryTopics, DemoTopics, Products} from './mock-data-topics';

export const listMockTopics = async (options: {
	search: string;
	pageNumber?: number;
	pageSize?: number;
}): Promise<TuplePage<QueryTopic>> => {
	const {pageNumber = 1, pageSize = 9} = options;
	return new Promise<TuplePage<QueryTopic>>((resolve) => {
		setTimeout(() => {
			resolve({
				data: DemoQueryTopics,
				itemCount: DemoQueryTopics.length,
				pageNumber,
				pageSize,
				pageCount: 3
			});
		}, 1000);
	});
};

export const fetchMockTopic = async (topicId: TopicId): Promise<{ topic: Topic }> => {
	let topic: Topic;

	// eslint-disable-next-line
	const found = DemoTopics.find(({topicId: id}) => id == topicId);
	if (found) {
		const {topicId, name, kind, type, description, factors, version, createdAt, lastModifiedAt} = found;
		topic = {topicId, name, kind, type, description, factors, version, createdAt, lastModifiedAt};
	} else {
		topic = {
			topicId,
			name: 'Mock Topic',
			kind: TopicKind.BUSINESS,
			type: TopicType.DISTINCT,
			factors: [],
			version: 1,
			createdAt: getCurrentTime(),
			lastModifiedAt: getCurrentTime()
		};
	}
	return {topic};
};

let newTopicId = 10000;
export const saveMockTopic = async (topic: Topic): Promise<void> => {
	return new Promise<void>((resolve) => {
		if (isFakedUuid(topic)) {
			topic.topicId = `${newTopicId++}`;
		}
		setTimeout(() => resolve(), 500);
	});
};

export const listMockTopicsForHolder = async (search: string): Promise<Array<QueryTopicForHolder>> => {
	return new Promise<Array<QueryTopicForHolder>>((resolve) => {
		setTimeout(() => {
			resolve(
				[
					{topicId: '3', name: 'Participant'},
					{topicId: '2', name: 'Order'},
					{topicId: '1', name: 'Quotation'}
				].filter((x) => x.name.toUpperCase().includes(search.toUpperCase()))
			);
		}, 500);
	});
};

export const fetchMockTopicRowCount = async (topic: TopicId, condition?: ParameterJoint): Promise<number> => {
	return new Promise<number>(resolve => {
		setTimeout(() => {
			resolve(Math.floor(Math.random() * 200) + 900);
		}, 500);
	});
};

export const fetchMockTopicDataIds = async (topic: TopicId, condition?: ParameterJoint): Promise<Array<string>> => {
	return new Promise<Array<string>>(resolve => {
		setTimeout(() => {
			resolve(new Array(Math.floor(Math.random() * 100) + 100).fill(1).map((_, index) => {
				return `${959146492349551600 + index}`;
			}));
		}, 500);
	});
};

export const mockRerunTopic = async (topicId: TopicId, pipelineId: PipelineId, dataId: string): Promise<void> => {
	const value = Math.random();
	if (value >= 0.05) {
		return new Promise<void>(resolve => setTimeout(resolve, Math.floor(Math.random() * 500) + 500));
	} else {
		return new Promise<void>((_, reject) => setTimeout(() => reject(new Error('A mock error')), Math.floor(Math.random() * 500) + 500));
	}
};

export const askMockSynonymFactors = async (topicName: string, dataSourceId: DataSourceId): Promise<Array<Factor>> => {
	return new Promise<Array<Factor>>(resolve => {
		setTimeout(() => {
			resolve(Products.factors);
		}, 500);
	});
};