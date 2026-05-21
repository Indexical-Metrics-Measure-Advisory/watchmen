import {DataSourceId} from './data-source-types';
import {Factor} from './factor-types';
import {TenantId} from './tenant-types';
import {OptimisticLock, Tuple, TupleHolder} from './tuple-types';

export enum TopicKind {
	SYSTEM = 'system',
	BUSINESS = 'business',
	SYNONYM = 'synonym'
}

export enum TopicType {
	RAW = 'raw',
	META = 'meta',
	DISTINCT = 'distinct',
	AGGREGATE = 'aggregate',
	TIME = 'time',
	RATIO = 'ratio'
}

export type TopicId = string;

export interface TopicStoragePrimaryKey {
	pk?: Array<string>;
	sk?: Array<string>;
}

export interface TopicStorageIndex {
	name?: string;
	pk?: Array<string>;
	sk?: Array<string>;
}

export interface TopicAlternatorStorage {
	primaryKey?: TopicStoragePrimaryKey;
	indexes?: Array<TopicStorageIndex>;
}

export interface TopicStorage {
	alternator?: TopicAlternatorStorage;
}

export interface Topic extends Tuple, OptimisticLock {
	topicId: TopicId;
	name: string;
	kind: TopicKind;
	type: TopicType;
	description?: string;
	factors: Array<Factor>;
	tenantId?: TenantId;
	dataSourceId?: DataSourceId;
	storage?: TopicStorage;
}

export interface TopicHolder extends TupleHolder {
	topicIds: Array<TopicId>;
}
