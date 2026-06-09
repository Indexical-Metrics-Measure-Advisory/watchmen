import { isDataQualityCenterEnabled, isSynonymDQCEnabled } from "@/feature-switch";
import { DataSourceType } from "./data-source-types";
import { FactorType } from "./factor-types";
import { QueryTopic } from "./query-topic-types";
import { Topic, TopicKind, TopicType } from "./topic-types";

export const isSystemTopic = (topic: Topic): boolean => topic.kind === TopicKind.SYSTEM;
export const isBusinessTopic = (topic: Topic): boolean => topic.kind === TopicKind.BUSINESS;
export const isSynonymTopic = (topic: Topic | QueryTopic): boolean => topic.kind === TopicKind.SYNONYM;
export const isNotSynonymTopic = (topic: Topic | QueryTopic): boolean => !isSynonymTopic(topic);
export const isRawTopic = (topic: Topic | QueryTopic): boolean => topic.type === TopicType.RAW;
export const isNotRawTopic = (topic: Topic | QueryTopic): boolean => !isRawTopic(topic);
export const isMetaTopic = (topic: Topic): boolean => topic.type === TopicType.META;
export const isDistinctTopic = (topic: Topic): boolean => topic.type === TopicType.DISTINCT;
export const isNotDistinctTopic = (topic: Topic): boolean => !isDistinctTopic(topic);
export const isAggregationTopic = (topic: Topic): boolean => {
	return TopicType.AGGREGATE === topic.type || TopicType.TIME === topic.type || TopicType.RATIO === topic.type;
};
export const isNotAggregationTopic = (topic: Topic): boolean => !isAggregationTopic(topic);
export const isS3Storage = (type: DataSourceType) => [DataSourceType.AWS_S3, DataSourceType.ALI_OSS].includes(type);
export const isRDSStorage = (type: DataSourceType) =>
	[
		DataSourceType.MSSQL,
		DataSourceType.MYSQL,
		DataSourceType.ORACLE,
		DataSourceType.POSTGRESQL,
		DataSourceType.AURORA_LIMITLESS,
		DataSourceType.DSQL,
		DataSourceType.TDSQL,
	].includes(type);
export const isKeyTypeSupported = (type?: DataSourceType) =>
	type != null && [DataSourceType.DYNAMODB, DataSourceType.TDSQL].includes(type);
export const isTdsql = (type?: DataSourceType) => type === DataSourceType.TDSQL;
export const isTdsqlShardkeySupported = (type?: FactorType) => {
	// TDSQL shardkey 字段支持: INT/BIGINT/CHAR/VARCHAR
	// 不支持: TEXT/JSON/OBJECT/ARRAY/DATE/TIME/DATETIME
	if (type == null) {
		return true;
	}
	return [FactorType.SEQUENCE, FactorType.NUMBER, FactorType.UNSIGNED].includes(type);
};

export const isTopicProfileAvailable = (topic?: Topic | QueryTopic | null): boolean => {
	return (
		topic != null &&
		isDataQualityCenterEnabled() &&
		isNotRawTopic(topic) &&
		(isSynonymDQCEnabled() || isNotSynonymTopic(topic))
	);
};
