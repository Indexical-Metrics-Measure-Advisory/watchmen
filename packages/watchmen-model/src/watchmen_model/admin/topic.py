from enum import Enum
from typing import Dict, List, Optional, Union

from watchmen_utilities import ExtendedBaseModel
from watchmen_model.common import DataSourceId, OptimisticLock, TenantBasedTuple, TopicId
from watchmen_utilities import ArrayHelper
from .factor import Factor


class TopicKind(str, Enum):
	SYSTEM = 'system',
	BUSINESS = 'business'
	SYNONYM = 'synonym'


class TopicType(str, Enum):
	RAW = 'raw',
	META = 'meta',
	DISTINCT = 'distinct',
	AGGREGATE = 'aggregate',
	TIME = 'time',
	RATIO = 'ratio'


def construct_factor(factor: Union[Factor, Dict]) -> Optional[Factor]:
	if factor is None:
		return None
	elif isinstance(factor, Factor):
		return factor
	else:
		return Factor(**factor)


def construct_factors(factors: Optional[List[Union[Factor, Dict]]]) -> Optional[List[Factor]]:
	if factors is None:
		return None
	else:
		return ArrayHelper(factors).map(lambda x: construct_factor(x)).to_list()


class TopicStoragePrimaryKey(ExtendedBaseModel):
	pk: Optional[List[str]] = None
	sk: Optional[List[str]] = None


class TopicStorageIndex(ExtendedBaseModel):
	name: Optional[str] = None
	pk: Optional[List[str]] = None
	sk: Optional[List[str]] = None


class TopicStorageQueryLimit(ExtendedBaseModel):
	default: Optional[int] = None
	max: Optional[int] = None


class TopicStorageReference(ExtendedBaseModel):
	type: Optional[str] = None
	indexName: Optional[str] = None


class TopicQueryProfile(ExtendedBaseModel):
	name: Optional[str] = None
	mode: Optional[str] = None
	unique: Optional[bool] = None
	factors: Optional[List[str]] = None
	partitionFactors: Optional[List[str]] = None
	sortFactors: Optional[List[str]] = None
	storage: Optional[TopicStorageReference] = None
	limits: Optional[TopicStorageQueryLimit] = None


class TopicAlternatorStorage(ExtendedBaseModel):
	primaryKey: Optional[TopicStoragePrimaryKey] = None
	indexes: Optional[List[TopicStorageIndex]] = None


class TopicStorage(ExtendedBaseModel):
	alternator: Optional[TopicAlternatorStorage] = None
	queryProfiles: Optional[List[TopicQueryProfile]] = None


def construct_topic_storage_primary_key(
		primary_key: Optional[Union[dict, TopicStoragePrimaryKey]]) -> Optional[TopicStoragePrimaryKey]:
	if primary_key is None:
		return None
	elif isinstance(primary_key, TopicStoragePrimaryKey):
		return primary_key
	else:
		return TopicStoragePrimaryKey(**primary_key)


def construct_topic_storage_index(index: Optional[Union[dict, TopicStorageIndex]]) -> Optional[TopicStorageIndex]:
	if index is None:
		return None
	elif isinstance(index, TopicStorageIndex):
		return index
	else:
		return TopicStorageIndex(**index)


def construct_topic_storage_indexes(
		indexes: Optional[List[Union[dict, TopicStorageIndex]]]) -> Optional[List[TopicStorageIndex]]:
	if indexes is None:
		return None
	else:
		return ArrayHelper(indexes).map(lambda x: construct_topic_storage_index(x)).to_list()


def construct_topic_storage_reference(
		reference: Optional[Union[dict, TopicStorageReference]]) -> Optional[TopicStorageReference]:
	if reference is None:
		return None
	elif isinstance(reference, TopicStorageReference):
		return reference
	else:
		return TopicStorageReference(**reference)


def construct_topic_storage_query_limit(
		limits: Optional[Union[dict, TopicStorageQueryLimit]]) -> Optional[TopicStorageQueryLimit]:
	if limits is None:
		return None
	elif isinstance(limits, TopicStorageQueryLimit):
		return limits
	else:
		return TopicStorageQueryLimit(**limits)


def construct_topic_query_profile(
		profile: Optional[Union[dict, TopicQueryProfile]]) -> Optional[TopicQueryProfile]:
	if profile is None:
		return None
	elif isinstance(profile, TopicQueryProfile):
		return profile
	else:
		payload = dict(profile)
		payload['storage'] = construct_topic_storage_reference(payload.get('storage'))
		payload['limits'] = construct_topic_storage_query_limit(payload.get('limits'))
		return TopicQueryProfile(**payload)


def construct_topic_query_profiles(
		profiles: Optional[List[Union[dict, TopicQueryProfile]]]) -> Optional[List[TopicQueryProfile]]:
	if profiles is None:
		return None
	else:
		return ArrayHelper(profiles).map(lambda x: construct_topic_query_profile(x)).to_list()


def construct_topic_alternator_storage(
		storage: Optional[Union[dict, TopicAlternatorStorage]]) -> Optional[TopicAlternatorStorage]:
	if storage is None:
		return None
	elif isinstance(storage, TopicAlternatorStorage):
		return storage
	else:
		payload = dict(storage)
		payload['primaryKey'] = construct_topic_storage_primary_key(payload.get('primaryKey'))
		payload['indexes'] = construct_topic_storage_indexes(payload.get('indexes'))
		return TopicAlternatorStorage(**payload)


def construct_topic_storage(storage: Optional[Union[dict, TopicStorage]]) -> Optional[TopicStorage]:
	if storage is None:
		return None
	elif isinstance(storage, TopicStorage):
		return storage
	else:
		payload = dict(storage)
		payload['alternator'] = construct_topic_alternator_storage(payload.get('alternator'))
		payload['queryProfiles'] = construct_topic_query_profiles(payload.get('queryProfiles'))
		return TopicStorage(**payload)


class Topic(ExtendedBaseModel, TenantBasedTuple, OptimisticLock):
	topicId: Optional[TopicId] = None
	name: Optional[str] = None
	type: Optional[TopicType] = TopicType.DISTINCT
	kind: Optional[TopicKind] = TopicKind.BUSINESS
	dataSourceId: Optional[DataSourceId] = None
	factors: Optional[List[Factor]] = []
	storage: Optional[TopicStorage] = None
	description: Optional[str] = None

	def __setattr__(self, name, value):
		if name == 'factors':
			super().__setattr__(name, construct_factors(value))
		elif name == 'storage':
			super().__setattr__(name, construct_topic_storage(value))
		else:
			super().__setattr__(name, value)


def is_raw_topic(topic: Topic) -> bool:
	return topic.type == TopicType.RAW


def is_aggregation_topic(topic: Topic) -> bool:
	topic_type = topic.type
	return topic_type == TopicType.AGGREGATE or topic_type == TopicType.RATIO or topic_type == TopicType.TIME
