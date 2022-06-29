import {DataSourceType} from './data-source-types';
import {QueryTopic} from './query-topic-types';
import {Topic, TopicKind, TopicType} from './topic-types';

export const isSystemTopic = (topic: Topic): boolean => topic.kind === TopicKind.SYSTEM;
export const isBusinessTopic = (topic: Topic): boolean => topic.kind === TopicKind.BUSINESS;
export const isSynonymTopic = (topic: Topic): boolean => topic.kind === TopicKind.SYNONYM;
export const isRawTopic = (topic: Topic | QueryTopic): boolean => topic.type === TopicType.RAW;
export const isNotRawTopic = (topic: Topic | QueryTopic): boolean => !isRawTopic(topic);
export const isMetaTopic = (topic: Topic): boolean => topic.type === TopicType.META;
export const isDistinctTopic = (topic: Topic): boolean => topic.type === TopicType.DISTINCT;
export const isNotDistinctTopic = (topic: Topic): boolean => !isDistinctTopic(topic);
export const isAggregationTopic = (topic: Topic): boolean => {
	return TopicType.AGGREGATE === topic.type
		|| TopicType.TIME === topic.type
		|| TopicType.RATIO === topic.type;
};
export const isNotAggregationTopic = (topic: Topic): boolean => !isAggregationTopic(topic);
export const isS3Storage = (type: DataSourceType) => [DataSourceType.AWS_S3, DataSourceType.ALI_OSS].includes(type);
export const isRDSStorage = (type: DataSourceType) => [DataSourceType.MSSQL, DataSourceType.MYSQL, DataSourceType.ORACLE, DataSourceType.POSTGRESQL].includes(type);

export const isTopicWriteable = (topic: Topic): boolean => topic.kind !== TopicKind.SYNONYM;
export const filterWriteableTopics = (topics: Array<Topic>) => (topics || []).filter(isTopicWriteable);