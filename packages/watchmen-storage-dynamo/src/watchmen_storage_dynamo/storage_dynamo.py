import json
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from logging import getLogger
from typing import Any, Dict, List, Optional, Tuple

from boto3.dynamodb.conditions import Attr, Key
from boto3.dynamodb.types import TypeDeserializer, TypeSerializer
from botocore.exceptions import ClientError

from watchmen_model.admin import FactorKeyType, Topic, TopicQueryProfile, TopicStorageIndex, TopicStoragePrimaryKey
from watchmen_model.common import DataPage
from watchmen_model.pipeline_kernel import TopicDataColumnNames
from watchmen_model.system import DataSource
from watchmen_storage import as_table_name, Entity, EntityCriteria, EntityCriteriaExpression, EntityCriteriaJoint, \
	EntityCriteriaJointConjunction, EntityCriteriaOperator, EntityDeleter, \
	EntityDistinctValuesFinder, EntityFinder, EntityHelper, EntityId, EntityIdHelper, EntityLimitedFinder, \
	EntityLimitedStraightValuesFinder, EntityList, EntityNotFoundException, EntityPager, EntitySort, \
	EntitySortMethod, EntityStraightAggregateColumn, EntityStraightValuesFinder, EntityUpdater, FreeAggregatePager, \
	FreeAggregator, FreeFinder, FreePager, TooManyEntitiesFoundException, TopicDataStorageSPI, TransactionalStorageSPI, \
	UnexpectedStorageException, UnsupportedStraightColumnException
logger = getLogger(__name__)

PK_ATTR = 'pk'
SK_ATTR = 'sk'
LOOKUP_ID_ATTR = TopicDataColumnNames.ID.value
LOOKUP_MAIN_PK_ATTR = 'main_pk'
LOOKUP_MAIN_SK_ATTR = 'main_sk'
MAX_TRANSACTION_WRITE_ACTIONS = 100

RESERVED_COLUMNS = {
	TopicDataColumnNames.ID.value,
	TopicDataColumnNames.RAW_TOPIC_DATA.value,
	TopicDataColumnNames.AGGREGATE_ASSIST.value,
	TopicDataColumnNames.VERSION.value,
	TopicDataColumnNames.TENANT_ID.value,
	TopicDataColumnNames.INSERT_TIME.value,
	TopicDataColumnNames.UPDATE_TIME.value
}


@dataclass
class DynamoIndexDefinition:
	name: str
	pk_fields: List[str]
	sk_fields: List[str]
	pk_attr: str
	sk_attr: Optional[str]


@dataclass
class DynamoQueryProfileDefinition:
	name: str
	mode: Optional[str]
	unique: bool
	pk_fields: List[str]
	sk_fields: List[str]
	key_attr: str
	sort_attr: Optional[str]
	index_name: Optional[str]
	default_limit: Optional[int]
	max_limit: Optional[int]


@dataclass
class DynamoTopicDefinition:
	topic_id: str
	table_name: str
	lookup_table_name: str
	primary_key: TopicStoragePrimaryKey
	primary_pk_fields: List[str]
	primary_sk_fields: List[str]
	indexes: List[DynamoIndexDefinition]
	query_profiles: Dict[str, DynamoQueryProfileDefinition]


@dataclass
class DynamoQueryPlan:
	key_attr: str
	index_name: Optional[str]
	pk_fields: List[str]
	sk_attr: Optional[str]
	sk_fields: List[str]
	equals_map: Dict[str, Any]
	range_expression: Optional[Any]
	scan_forward: Optional[bool]
	limit: Optional[int]
	allow_extra_filter: bool = True


class StorageDynamo(TransactionalStorageSPI):
	def __init__(self, engine: Any):
		self.engine = engine
		self.resource = engine.resource
		self.client = engine.client
		self.tablePrefix = engine.table_prefix or ''
		self.consistentRead = bool(getattr(engine, 'consistent_read', False))
		self.tableBillingMode = getattr(engine, 'table_billing_mode', 'PROVISIONED')
		self.topics: Dict[str, DynamoTopicDefinition] = {}
		self.type_serializer = TypeSerializer()
		self.type_deserializer = TypeDeserializer()

	def connect(self) -> None:
		# boto3 client/resource are lazy and shared, no explicit connection needed.
		pass

	def begin(self) -> None:
		# first version does not provide transaction semantics.
		pass

	def commit_and_close(self) -> None:
		self.close()

	def rollback_and_close(self) -> None:
		self.close()

	def close(self) -> None:
		# boto3 client/resource are reused, no explicit close required here.
		pass

	def _safe_name(self, value: str) -> str:
		return ''.join(ch if ch.isalnum() else '_' for ch in value.lower())

	def _prefix_table_name(self, value: str) -> str:
		return f'{self.tablePrefix}{value}'

	def _normalize_field_name(self, value: str) -> str:
		if value in RESERVED_COLUMNS:
			return value
		return value.replace('.', '_').lower()

	def _normalize_fields(self, values: Optional[List[str]]) -> List[str]:
		return [self._normalize_field_name(value) for value in values or []]

	def _gsi_pk_attr(self, name: str) -> str:
		return f'gsi_{self._safe_name(name)}_pk'

	def _gsi_sk_attr(self, name: str) -> str:
		return f'gsi_{self._safe_name(name)}_sk'

	def _serialize_value(self, value: Any) -> Any:
		if isinstance(value, dict):
			return {key: self._serialize_value(child) for key, child in value.items()}
		if isinstance(value, list):
			return [self._serialize_value(child) for child in value]
		if isinstance(value, tuple):
			return [self._serialize_value(child) for child in value]
		if isinstance(value, datetime):
			return value.isoformat()
		if isinstance(value, date):
			return value.isoformat()
		if isinstance(value, float):
			return Decimal(str(value))
		return value

	def _deserialize_value(self, value: Any) -> Any:
		if isinstance(value, dict):
			return {key: self._deserialize_value(child) for key, child in value.items()}
		if isinstance(value, list):
			return [self._deserialize_value(child) for child in value]
		if isinstance(value, Decimal):
			if value == value.to_integral_value():
				return int(value)
			return float(value)
		return value

	def _to_attribute_value(self, value: Any) -> Dict[str, Any]:
		return self.type_serializer.serialize(self._serialize_value(value))

	def _to_attribute_map(self, item: Dict[str, Any]) -> Dict[str, Any]:
		return {key: self._to_attribute_value(value) for key, value in item.items()}

	def _from_attribute_map(self, item: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
		if item is None:
			return None
		return {
			key: self._deserialize_value(self.type_deserializer.deserialize(value))
			for key, value in item.items()
		}

	def _build_expected_equals_parts(
			self, expected_equals: Dict[str, Any]
	) -> Tuple[Optional[str], Optional[Dict[str, str]], Optional[Dict[str, Dict[str, Any]]]]:
		if len(expected_equals) == 0:
			return None, None, None
		expression_attribute_names = {}
		expression_attribute_values = {}
		parts = []
		for index, (key, value) in enumerate(expected_equals.items()):
			name_token = f'#n{index}'
			value_token = f':v{index}'
			expression_attribute_names[name_token] = key
			expression_attribute_values[value_token] = self._to_attribute_value(value)
			parts.append(f'{name_token} = {value_token}')
		return ' AND '.join(parts), expression_attribute_names, expression_attribute_values

	def _is_conditional_failure_exception(self, error: ClientError) -> bool:
		error_code = error.response.get('Error', {}).get('Code')
		if error_code == 'ConditionalCheckFailedException':
			return True
		if error_code != 'TransactionCanceledException':
			return False
		for reason in error.response.get('CancellationReasons', []):
			if reason.get('Code') == 'ConditionalCheckFailed':
				return True
		return False

	def _raise_conditional_check_failed(self, message: str = 'Conditional check failed.') -> None:
		raise ClientError({'Error': {'Code': 'ConditionalCheckFailedException', 'Message': message}},
		                  'TransactWriteItems')

	def _transact_write_items(self, actions: List[Dict[str, Any]]) -> None:
		self.client.transact_write_items(TransactItems=actions)

	def _transact_get_item(self, table_name: str, key: Dict[str, Any]) -> Optional[Dict[str, Any]]:
		response = self.client.transact_get_items(TransactItems=[{
			'Get': {
				'TableName': table_name,
				'Key': self._to_attribute_map(key)
			}
		}])
		responses = response.get('Responses', [])
		if len(responses) == 0:
			return None
		return self._from_attribute_map(responses[0].get('Item'))

	def _encode_key_part(self, value: Any) -> str:
		if value is None:
			return '__null__'
		if isinstance(value, datetime):
			return value.isoformat()
		if isinstance(value, date):
			return value.isoformat()
		if isinstance(value, bool):
			return 'true' if value else 'false'
		if isinstance(value, Decimal):
			return format(value, 'f')
		if isinstance(value, (int, float)):
			return str(value)
		if isinstance(value, (dict, list, tuple)):
			return json.dumps(value, ensure_ascii=True, separators=(',', ':'), default=str)
		return str(value)

	def _compose_key_from_row(self, row: Dict[str, Any], fields: List[str], required: bool = True) -> Optional[str]:
		if len(fields) == 0:
			return None
		values = []
		for field in fields:
			value = row.get(field)
			if value is None:
				if required:
					raise UnexpectedStorageException(f'Missing key field[{field}] in row[{row}].')
				return None
			values.append(self._encode_key_part(value))
		return '#'.join(values)

	def _compose_key_from_values(self, values: Dict[str, Any], fields: List[str]) -> str:
		if len(fields) == 0:
			return ''
		return '#'.join(self._encode_key_part(values.get(field)) for field in fields)

	def _table(self, table_name: str):
		return self.resource.Table(table_name)

	def _main_table(self, definition: DynamoTopicDefinition):
		return self._table(definition.table_name)

	def _lookup_table(self, definition: DynamoTopicDefinition):
		return self._table(definition.lookup_table_name)

	def _extract_primary_key_config(self, topic: Topic) -> TopicStoragePrimaryKey:
		storage = getattr(topic, 'storage', None)
		alternator = getattr(storage, 'alternator', None) if storage is not None else None
		primary_key = getattr(alternator, 'primaryKey', None) if alternator is not None else None
		if primary_key is None or primary_key.pk is None or len(primary_key.pk) == 0:
			raise UnexpectedStorageException(
				f'Topic[id={topic.topicId}, name={topic.name}] does not declare storage.alternator.primaryKey.pk.')
		return primary_key

	def _extract_primary_key_from_factors(self, topic: Topic) -> Optional[TopicStoragePrimaryKey]:
		factors = list(getattr(topic, 'factors', None) or [])
		if len(factors) == 0:
			return None

		def factor_attr(factor: Any, key: str) -> Any:
			if isinstance(factor, dict):
				return factor.get(key)
			return getattr(factor, key, None)

		def sort_key_fields(key_type: str) -> List[str]:
			key_factors = []
			for factor in factors:
				if factor_attr(factor, 'keyType') != key_type:
					continue
				name = factor_attr(factor, 'name')
				if name is None or len(str(name).strip()) == 0:
					raise UnexpectedStorageException(
						f'Topic[id={topic.topicId}, name={topic.name}] contains key factor without name[{factor}].')
				key_index = factor_attr(factor, 'keyIndex')
				if key_index is None:
					raise UnexpectedStorageException(
						f'Topic[id={topic.topicId}, name={topic.name}] key factor[{name}] missing keyIndex.')
				try:
					order = int(key_index)
				except (TypeError, ValueError):
					raise UnexpectedStorageException(
						f'Topic[id={topic.topicId}, name={topic.name}] key factor[{name}] has invalid keyIndex[{key_index}].')
				if order <= 0:
					raise UnexpectedStorageException(
						f'Topic[id={topic.topicId}, name={topic.name}] key factor[{name}] requires keyIndex > 0.')
				key_factors.append((order, name))
			if len(key_factors) == 0:
				return []
			key_factors.sort(key=lambda x: x[0])
			orders = [order for order, _ in key_factors]
			if len(set(orders)) != len(orders):
				raise UnexpectedStorageException(
					f'Topic[id={topic.topicId}, name={topic.name}] contains duplicated {key_type} keyIndex values.')
			return [name for _, name in key_factors]

		partition_fields = sort_key_fields(FactorKeyType.PARTITION.value)
		sort_fields = sort_key_fields(FactorKeyType.SORT.value)
		if len(partition_fields) == 0 and len(sort_fields) == 0:
			return None
		if len(partition_fields) == 0:
			raise UnexpectedStorageException(
				f'Topic[id={topic.topicId}, name={topic.name}] declares sort keys without partition keys.')
		return TopicStoragePrimaryKey(pk=partition_fields, sk=sort_fields)

	def _extract_indexes(self, topic: Topic) -> List[TopicStorageIndex]:
		storage = getattr(topic, 'storage', None)
		alternator = getattr(storage, 'alternator', None) if storage is not None else None
		indexes = getattr(alternator, 'indexes', None) if alternator is not None else None
		return list(indexes or [])

	def _extract_query_profiles(self, topic: Topic) -> List[TopicQueryProfile]:
		storage = getattr(topic, 'storage', None)
		profiles = getattr(storage, 'queryProfiles', None) if storage is not None else None
		return list(profiles or [])

	def _build_query_profile_definition(
			self, profile: TopicQueryProfile, index_map: Dict[str, DynamoIndexDefinition]
	) -> DynamoQueryProfileDefinition:
		if profile.name is None:
			raise UnexpectedStorageException('Query profile name is required for Alternator storage.')
		storage_reference = getattr(profile, 'storage', None)
		storage_type = getattr(storage_reference, 'type', None) if storage_reference is not None else None
		index_name = getattr(storage_reference, 'indexName', None) if storage_reference is not None else None
		default_limit = getattr(getattr(profile, 'limits', None), 'default', None)
		max_limit = getattr(getattr(profile, 'limits', None), 'max', None)
		factors = self._normalize_fields(profile.factors)
		partition_fields = self._normalize_fields(profile.partitionFactors or profile.factors)
		sort_fields = self._normalize_fields(profile.sortFactors)
		if storage_type == 'gsi':
			if index_name is None:
				raise UnexpectedStorageException(f'Query profile[{profile.name}] missing storage.indexName.')
			index = index_map.get(index_name)
			if index is None:
				raise UnexpectedStorageException(
					f'Query profile[{profile.name}] references unknown index[{index_name}].')
			return DynamoQueryProfileDefinition(
				name=profile.name,
				mode=profile.mode,
				unique=bool(profile.unique),
				pk_fields=partition_fields or factors or index.pk_fields,
				sk_fields=sort_fields or index.sk_fields,
				key_attr=index.pk_attr,
				sort_attr=index.sk_attr,
				index_name=index.name,
				default_limit=default_limit,
				max_limit=max_limit
			)
		if storage_type in (None, 'primary'):
			return DynamoQueryProfileDefinition(
				name=profile.name,
				mode=profile.mode,
				unique=bool(profile.unique),
				pk_fields=partition_fields or factors,
				sk_fields=sort_fields,
				key_attr=PK_ATTR,
				sort_attr=SK_ATTR if len(sort_fields) != 0 else None,
				index_name=None,
				default_limit=default_limit,
				max_limit=max_limit
			)
		raise UnexpectedStorageException(
			f'Query profile[{profile.name}] references unsupported storage type[{storage_type}].')

	def _build_topic_definition(self, topic: Topic) -> DynamoTopicDefinition:
		print("----------------------------")
		print(topic)
		primary_key = self._extract_primary_key_from_factors(topic)
		print(primary_key)
		print("----------------------------")
		primary_pk_fields = self._normalize_fields(primary_key.pk)
		primary_sk_fields = self._normalize_fields(primary_key.sk)
		indexes: List[DynamoIndexDefinition] = []
		index_map: Dict[str, DynamoIndexDefinition] = {}
		for index in self._extract_indexes(topic):
			if index.name is None or index.pk is None or len(index.pk) == 0:
				raise UnexpectedStorageException(
					f'Topic[id={topic.topicId}, name={topic.name}] contains invalid alternator index[{index}].')
			index_definition = DynamoIndexDefinition(
				name=index.name,
				pk_fields=self._normalize_fields(index.pk),
				sk_fields=self._normalize_fields(index.sk),
				pk_attr=self._gsi_pk_attr(index.name),
				sk_attr=self._gsi_sk_attr(index.name) if len(index.sk or []) != 0 else None
			)
			indexes.append(index_definition)
			index_map[index_definition.name] = index_definition
		query_profiles: Dict[str, DynamoQueryProfileDefinition] = {}
		for profile in self._extract_query_profiles(topic):
			profile_definition = self._build_query_profile_definition(profile, index_map)
			query_profiles[profile_definition.name] = profile_definition
		table_name = self._prefix_table_name(as_table_name(topic))
		return DynamoTopicDefinition(
			topic_id=topic.topicId,
			table_name=table_name,
			lookup_table_name=f'{table_name}__id_lookup',
			primary_key=primary_key,
			primary_pk_fields=primary_pk_fields,
			primary_sk_fields=primary_sk_fields,
			indexes=indexes,
			query_profiles=query_profiles
		)

	def _get_topic_definition(self, entity_name: str) -> DynamoTopicDefinition:
		definition = self.topics.get(entity_name)
		if definition is None:
			raise UnexpectedStorageException(f'Topic entity[{entity_name}] is not registered on Dynamo storage.')
		return definition

	def _build_index_attributes(self, row: Dict[str, Any], definition: DynamoTopicDefinition) -> Dict[str, Any]:
		attributes: Dict[str, Any] = {}
		for index in definition.indexes:
			pk_value = self._compose_key_from_row(row, index.pk_fields, required=False)
			if pk_value is None:
				continue
			attributes[index.pk_attr] = pk_value
			if index.sk_attr is not None:
				sk_value = self._compose_key_from_row(row, index.sk_fields, required=False)
				if sk_value is not None:
					attributes[index.sk_attr] = sk_value
		return attributes

	def _build_main_item(self, row: Dict[str, Any], definition: DynamoTopicDefinition) -> Dict[str, Any]:
		item = {key: self._serialize_value(value) for key, value in row.items()}
		item[PK_ATTR] = self._compose_key_from_row(row, definition.primary_pk_fields)
		if len(definition.primary_sk_fields) != 0:
			item[SK_ATTR] = self._compose_key_from_row(row, definition.primary_sk_fields)
		item.update(self._build_index_attributes(row, definition))
		return item

	def _encode_lookup_id(self, data_id: EntityId) -> str:
		return self._encode_key_part(data_id)

	def _lookup_key(self, data_id: EntityId) -> Dict[str, Any]:
		return {LOOKUP_ID_ATTR: self._encode_lookup_id(data_id)}

	def _main_key_from_lookup(self, definition: DynamoTopicDefinition, lookup_item: Dict[str, Any]) -> Dict[str, Any]:
		key = {PK_ATTR: lookup_item[LOOKUP_MAIN_PK_ATTR]}
		if len(definition.primary_sk_fields) != 0:
			key[SK_ATTR] = lookup_item[LOOKUP_MAIN_SK_ATTR]
		return key

	def _build_lookup_item(self, row: Dict[str, Any], main_item: Dict[str, Any]) -> Dict[str, Any]:
		data_id = row.get(LOOKUP_ID_ATTR)
		if data_id is None:
			raise UnexpectedStorageException(f'Row[{row}] does not contain id column[{LOOKUP_ID_ATTR}].')
		item = {
			LOOKUP_ID_ATTR: self._encode_lookup_id(data_id),
			LOOKUP_MAIN_PK_ATTR: main_item[PK_ATTR]
		}
		if SK_ATTR in main_item:
			item[LOOKUP_MAIN_SK_ATTR] = main_item[SK_ATTR]
		return item

	def _clean_item(self, item: Optional[Dict[str, Any]], definition: DynamoTopicDefinition) -> Optional[Dict[str, Any]]:
		if item is None:
			return None
		cleaned = {
			key: self._deserialize_value(value)
			for key, value in item.items()
			if key not in {PK_ATTR, SK_ATTR, *[index.pk_attr for index in definition.indexes],
			               *[index.sk_attr for index in definition.indexes if index.sk_attr is not None]}
		}
		return cleaned

	def _build_condition_expression(self, expected_equals: Dict[str, Any]):
		condition = None
		for key, value in expected_equals.items():
			part = Attr(key).eq(self._serialize_value(value))
			condition = part if condition is None else condition & part
		return condition

	def _find_matching_query_profile(
			self, definition: DynamoTopicDefinition, equals_map: Dict[str, Any], mode: Optional[str]
	) -> Optional[DynamoQueryProfileDefinition]:
		candidates = []
		for profile in definition.query_profiles.values():
			if mode is not None and profile.mode != mode:
				continue
			required_fields = list(profile.pk_fields) + list(profile.sk_fields)
			if len(required_fields) == 0:
				continue
			if all(field in equals_map for field in required_fields):
				candidates.append(profile)
		if len(candidates) == 0:
			return None
		candidates.sort(key=lambda x: len(x.pk_fields) + len(x.sk_fields), reverse=True)
		return candidates[0]

	def _validate_result_count_by_mode(
			self, rows: List[Dict[str, Any]], mode: Optional[str], definition: DynamoTopicDefinition,
			equals_map: Dict[str, Any]
	) -> None:
		if mode != 'one':
			return
		if len(rows) <= 1:
			return
		profile = self._find_matching_query_profile(definition, equals_map, mode)
		if profile is not None and profile.unique:
			raise TooManyEntitiesFoundException(
				f'Query profile[{profile.name}] is declared unique but returned {len(rows)} rows.')

	def _build_main_key_from_row(self, definition: DynamoTopicDefinition, row: Dict[str, Any]) -> Dict[str, Any]:
		key = {PK_ATTR: self._compose_key_from_row(row, definition.primary_pk_fields)}
		if len(definition.primary_sk_fields) != 0:
			key[SK_ATTR] = self._compose_key_from_row(row, definition.primary_sk_fields)
		return key

	def _assert_primary_key_unchanged(
			self, definition: DynamoTopicDefinition, row: Dict[str, Any], existing_lookup_item: Optional[Dict[str, Any]]
	) -> None:
		if existing_lookup_item is None:
			return
		old_key = self._main_key_from_lookup(definition, existing_lookup_item)
		new_key = self._build_main_key_from_row(definition, row)
		if old_key != new_key:
			raise UnexpectedStorageException(
				'Updating fields participating in primary key is not supported in current Dynamo storage version.')

	def _put_row(
			self,
			definition: DynamoTopicDefinition,
			row: Dict[str, Any],
			expected_equals: Optional[Dict[str, Any]] = None,
			existing_lookup_item: Optional[Dict[str, Any]] = None
	) -> None:
		self._assert_primary_key_unchanged(definition, row, existing_lookup_item)
		main_item = self._build_main_item(row, definition)
		condition_expression, expression_attribute_names, expression_attribute_values = \
			self._build_expected_equals_parts(expected_equals or {})
		main_put = {
			'TableName': definition.table_name,
			'Item': self._to_attribute_map(main_item)
		}
		if condition_expression is not None:
			main_put['ConditionExpression'] = condition_expression
			main_put['ExpressionAttributeNames'] = expression_attribute_names
			main_put['ExpressionAttributeValues'] = expression_attribute_values
		lookup_item = self._build_lookup_item(row, main_item)
		try:
			self._transact_write_items([
				{'Put': main_put},
				{
					'Put': {
						'TableName': definition.lookup_table_name,
						'Item': self._to_attribute_map(lookup_item)
					}
				}
			])
		except ClientError as e:
			if self._is_conditional_failure_exception(e):
				self._raise_conditional_check_failed(e.response.get('Error', {}).get('Message', 'Conditional check failed.'))
			raise

	def _delete_by_lookup_item(
			self,
			definition: DynamoTopicDefinition,
			lookup_item: Dict[str, Any],
			expected_equals: Optional[Dict[str, Any]] = None
	) -> int:
		if lookup_item is None:
			return 0
		condition_expression, expression_attribute_names, expression_attribute_values = \
			self._build_expected_equals_parts(expected_equals or {})
		main_delete = {
			'TableName': definition.table_name,
			'Key': self._to_attribute_map(self._main_key_from_lookup(definition, lookup_item))
		}
		if condition_expression is not None:
			main_delete['ConditionExpression'] = condition_expression
			main_delete['ExpressionAttributeNames'] = expression_attribute_names
			main_delete['ExpressionAttributeValues'] = expression_attribute_values
		try:
			self._transact_write_items([
				{'Delete': main_delete},
				{
					'Delete': {
						'TableName': definition.lookup_table_name,
						'Key': self._to_attribute_map(self._lookup_key(lookup_item[LOOKUP_ID_ATTR]))
					}
				}
			])
			return 1
		except ClientError as e:
			if self._is_conditional_failure_exception(e):
				return 0
			raise

	def _load_lookup_item(self, definition: DynamoTopicDefinition, entity_id: EntityId) -> Optional[Dict[str, Any]]:
		return self._transact_get_item(definition.lookup_table_name, self._lookup_key(entity_id))

	def _load_row_by_lookup(self, definition: DynamoTopicDefinition, lookup_item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
		if lookup_item is None:
			return None
		item = self._transact_get_item(definition.table_name, self._main_key_from_lookup(definition, lookup_item))
		return self._clean_item(item, definition)

	def _load_row_by_id(self, definition: DynamoTopicDefinition, entity_id: EntityId) -> Optional[Dict[str, Any]]:
		return self._load_row_by_lookup(definition, self._load_lookup_item(definition, entity_id))

	def _flatten_criteria(self, criteria: Optional[EntityCriteria]) -> List[EntityCriteriaExpression]:
		def flatten_statement(statement) -> List[EntityCriteriaExpression]:
			if isinstance(statement, EntityCriteriaExpression):
				return [statement]
			if isinstance(statement, EntityCriteriaJoint):
				if statement.conjunction != EntityCriteriaJointConjunction.AND:
					raise UnexpectedStorageException('Only AND criteria are supported by current Dynamo storage version.')
				expressions: List[EntityCriteriaExpression] = []
				for child in statement.children:
					expressions.extend(flatten_statement(child))
				return expressions
			raise UnexpectedStorageException(f'Unsupported criteria statement[{statement}].')

		expressions: List[EntityCriteriaExpression] = []
		for statement in criteria or []:
			expressions.extend(flatten_statement(statement))
		return expressions

	def _criterion_column_name(self, expression: EntityCriteriaExpression) -> str:
		left = expression.left
		column_name = getattr(left, 'columnName', None)
		if column_name is None:
			raise UnexpectedStorageException(
				f'Only column-based criteria are supported by current Dynamo storage version, got[{expression}].')
		return column_name

	def _criterion_right_value(self, expression: EntityCriteriaExpression) -> Any:
		right = expression.right
		if hasattr(right, 'columnName') or hasattr(right, 'operator'):
			raise UnexpectedStorageException(
				f'Only plain-value criteria are supported by current Dynamo storage version, got[{expression}].')
		return right

	def _extract_equals_map(self, expressions: List[EntityCriteriaExpression]) -> Dict[str, Any]:
		equals_map = {}
		for expression in expressions:
			if expression.operator == EntityCriteriaOperator.EQUALS:
				equals_map[self._criterion_column_name(expression)] = self._criterion_right_value(expression)
		return equals_map

	def _extract_single_sort_column(self, sort: Optional[EntitySort]) -> Optional[Tuple[str, EntitySortMethod]]:
		if sort is None or len(sort) == 0:
			return None
		if len(sort) != 1:
			raise UnexpectedStorageException(
				'Current Dynamo storage only supports sorting by one declared sort key column.')
		sort_column = sort[0]
		return sort_column.name, sort_column.method

	def _build_range_expression(self, sk_attr: str, sk_fields: List[str], expressions: List[EntityCriteriaExpression],
	                           equals_map: Dict[str, Any]) -> Optional[Any]:
		if len(sk_fields) == 0:
			return None
		prefix_equals = []
		for field in sk_fields:
			if field in equals_map:
				prefix_equals.append(field)
			else:
				break
		key_expression = None
		if len(prefix_equals) != 0:
			key_expression = Key(sk_attr).begins_with(self._compose_key_from_values(equals_map, prefix_equals))

		range_field_index = len(prefix_equals)
		if range_field_index >= len(sk_fields):
			return key_expression
		range_field = sk_fields[range_field_index]
		lower = None
		upper = None
		for expression in expressions:
			if self._criterion_column_name(expression) != range_field:
				continue
			value = self._criterion_right_value(expression)
			if expression.operator == EntityCriteriaOperator.GREATER_THAN:
				lower = (value, False)
			elif expression.operator == EntityCriteriaOperator.GREATER_THAN_OR_EQUALS:
				lower = (value, True)
			elif expression.operator == EntityCriteriaOperator.LESS_THAN:
				upper = (value, False)
			elif expression.operator == EntityCriteriaOperator.LESS_THAN_OR_EQUALS:
				upper = (value, True)
		if lower is None and upper is None:
			return key_expression
		if len(prefix_equals) != range_field_index:
			raise UnexpectedStorageException(
				f'Range query on sort field[{range_field}] requires all preceding sort fields to be provided.')
		lower_value = self._compose_key_from_values({range_field: lower[0]}, [range_field]) if lower else None
		upper_value = self._compose_key_from_values({range_field: upper[0]}, [range_field]) if upper else None
		range_expression = None
		if lower is not None and upper is not None:
			range_expression = Key(sk_attr).between(lower_value, upper_value)
		elif lower is not None:
			range_expression = Key(sk_attr).gte(lower_value) if lower[1] else Key(sk_attr).gt(lower_value)
		else:
			range_expression = Key(sk_attr).lte(upper_value) if upper[1] else Key(sk_attr).lt(upper_value)
		if key_expression is None:
			return range_expression
		return key_expression & range_expression

	def _build_query_plan(
			self,
			definition: DynamoTopicDefinition,
			expressions: List[EntityCriteriaExpression],
			sort: Optional[EntitySort] = None,
			limit: Optional[int] = None,
			mode: Optional[str] = None
	) -> DynamoQueryPlan:
		equals_map = self._extract_equals_map(expressions)
		profile = self._find_matching_query_profile(definition, equals_map, mode)
		if profile is not None:
			sort_column = self._extract_single_sort_column(sort)
			if sort_column is not None:
				if len(profile.sk_fields) == 0 or sort_column[0] != profile.sk_fields[0]:
					raise UnexpectedStorageException(
						f'Query profile[{profile.name}] only supports sorting on declared first sort field.')
				scan_forward = sort_column[1] == EntitySortMethod.ASC
			else:
				scan_forward = None
			if profile.max_limit is not None and limit is not None and limit > profile.max_limit:
				raise UnexpectedStorageException(
					f'Query profile[{profile.name}] limit[{limit}] exceeds max[{profile.max_limit}].')
			plan_limit = limit or profile.default_limit
			range_expression = self._build_range_expression(
				profile.sort_attr, profile.sk_fields, expressions, equals_map) if profile.sort_attr else None
			return DynamoQueryPlan(
				key_attr=profile.key_attr,
				index_name=profile.index_name,
				pk_fields=profile.pk_fields,
				sk_attr=profile.sort_attr,
				sk_fields=profile.sk_fields,
				equals_map=equals_map,
				range_expression=range_expression,
				scan_forward=scan_forward,
				limit=plan_limit
			)

		sort_column = self._extract_single_sort_column(sort)
		def build_plan(key_attr: str, pk_fields: List[str], sk_attr: Optional[str], sk_fields: List[str],
		               index_name: Optional[str]) -> Optional[DynamoQueryPlan]:
			if len(pk_fields) == 0 or not all(field in equals_map for field in pk_fields):
				return None
			scan_forward = None
			if sort_column is not None:
				if len(sk_fields) == 0 or sort_column[0] != sk_fields[0]:
					raise UnexpectedStorageException(
						'Current Dynamo storage only supports sorting by the first declared sort-key field.')
				scan_forward = sort_column[1] == EntitySortMethod.ASC
			return DynamoQueryPlan(
				key_attr=key_attr,
				index_name=index_name,
				pk_fields=pk_fields,
				sk_attr=sk_attr,
				sk_fields=sk_fields,
				equals_map=equals_map,
				range_expression=self._build_range_expression(sk_attr, sk_fields, expressions, equals_map)
				if sk_attr is not None else None,
				scan_forward=scan_forward,
				limit=limit
			)

		plan = build_plan(
			PK_ATTR,
			definition.primary_pk_fields,
			SK_ATTR if len(definition.primary_sk_fields) != 0 else None,
			definition.primary_sk_fields,
			None
		)
		if plan is not None:
			return plan
		for index in definition.indexes:
			plan = build_plan(index.pk_attr, index.pk_fields, index.sk_attr, index.sk_fields, index.name)
			if plan is not None:
				return plan
		raise UnexpectedStorageException(
			'Current Dynamo storage only supports queries anchored by declared primary key, indexes or query profiles.')

	def _match_expression(self, row: Dict[str, Any], expression: EntityCriteriaExpression) -> bool:
		left_value = row.get(self._criterion_column_name(expression))
		right_value = self._criterion_right_value(expression)
		operator = expression.operator
		if operator == EntityCriteriaOperator.IS_EMPTY:
			return left_value is None
		if operator == EntityCriteriaOperator.IS_NOT_EMPTY:
			return left_value is not None
		if operator == EntityCriteriaOperator.IS_BLANK:
			return left_value is None or left_value == ''
		if operator == EntityCriteriaOperator.IS_NOT_BLANK:
			return left_value is not None and left_value != ''
		if operator == EntityCriteriaOperator.EQUALS:
			return left_value == right_value
		if operator == EntityCriteriaOperator.NOT_EQUALS:
			return left_value != right_value
		if operator == EntityCriteriaOperator.LESS_THAN:
			return left_value is not None and left_value < right_value
		if operator == EntityCriteriaOperator.LESS_THAN_OR_EQUALS:
			return left_value is not None and left_value <= right_value
		if operator == EntityCriteriaOperator.GREATER_THAN:
			return left_value is not None and left_value > right_value
		if operator == EntityCriteriaOperator.GREATER_THAN_OR_EQUALS:
			return left_value is not None and left_value >= right_value
		if operator == EntityCriteriaOperator.IN:
			return left_value in (right_value or [])
		if operator == EntityCriteriaOperator.NOT_IN:
			return left_value not in (right_value or [])
		if operator == EntityCriteriaOperator.LIKE:
			return left_value is not None and str(right_value).replace('%', '') in str(left_value)
		if operator == EntityCriteriaOperator.NOT_LIKE:
			return left_value is None or str(right_value).replace('%', '') not in str(left_value)
		raise UnexpectedStorageException(f'Unsupported criteria operator[{operator}] in Dynamo storage.')

	def _match_row(self, row: Dict[str, Any], expressions: List[EntityCriteriaExpression]) -> bool:
		return all(self._match_expression(row, expression) for expression in expressions)

	def _sort_rows(self, rows: List[Dict[str, Any]], sort: Optional[EntitySort]) -> List[Dict[str, Any]]:
		if sort is None or len(sort) == 0:
			return rows
		for sort_column in reversed(sort):
			reverse = sort_column.method == EntitySortMethod.DESC
			rows = sorted(rows, key=lambda row: (row.get(sort_column.name) is None, row.get(sort_column.name)),
			              reverse=reverse)
		return rows

	def _query_all(self, table, key_expression, index_name: Optional[str] = None,
	               limit: Optional[int] = None, scan_forward: Optional[bool] = None) -> List[Dict[str, Any]]:
		items: List[Dict[str, Any]] = []
		exclusive_start_key = None
		while True:
			params = {'KeyConditionExpression': key_expression}
			if index_name is not None:
				params['IndexName'] = index_name
			elif self.consistentRead:
				params['ConsistentRead'] = True
			if scan_forward is not None:
				params['ScanIndexForward'] = scan_forward
			if exclusive_start_key is not None:
				params['ExclusiveStartKey'] = exclusive_start_key
			if limit is not None:
				params['Limit'] = limit - len(items)
			response = table.query(**params)
			items.extend(response.get('Items', []))
			if limit is not None and len(items) >= limit:
				return items[:limit]
			exclusive_start_key = response.get('LastEvaluatedKey')
			if exclusive_start_key is None:
				return items

	def _query_by_definition(
			self,
			definition: DynamoTopicDefinition,
			expressions: List[EntityCriteriaExpression],
			sort: Optional[EntitySort] = None,
			limit: Optional[int] = None,
			mode: Optional[str] = None
	) -> List[Dict[str, Any]]:
		if len(expressions) == 0:
			raise UnexpectedStorageException('Full table query is not supported by current Dynamo storage version.')
		equals_map = self._extract_equals_map(expressions)
		if LOOKUP_ID_ATTR in equals_map:
			row = self._load_row_by_id(definition, equals_map[LOOKUP_ID_ATTR])
			if row is None:
				return []
			return [row] if self._match_row(row, expressions) else []
		query_limit = limit
		if mode == 'one' and limit == 1:
			query_limit = 2
		plan = self._build_query_plan(definition, expressions, sort=sort, limit=limit, mode=mode)
		pk_value = self._compose_key_from_values(plan.equals_map, plan.pk_fields)
		key_expression = Key(plan.key_attr).eq(pk_value)
		if plan.range_expression is not None:
			key_expression = key_expression & plan.range_expression
		items = self._query_all(
			self._main_table(definition),
			key_expression,
			index_name=plan.index_name,
			limit=query_limit or plan.limit,
			scan_forward=plan.scan_forward
		)
		rows = [self._clean_item(item, definition) for item in items]
		rows = [row for row in rows if row is not None and self._match_row(row, expressions)]
		self._validate_result_count_by_mode(rows, mode, definition, equals_map)
		if limit is not None:
			rows = rows[:limit]
		return rows

	def _compute_page(self, count: int, page_size: int, page_number: int) -> Tuple[int, int]:
		pages = count / page_size
		max_page_number = int(pages)
		if pages > max_page_number:
			max_page_number += 1
		if page_number > max_page_number:
			page_number = max_page_number
		return page_number, max_page_number

	def insert_one(self, one: Entity, helper: EntityHelper) -> None:
		definition = self._get_topic_definition(helper.name)
		row = helper.shaper.serialize(one)
		self._put_row(definition, row)

	def insert_all(self, data: List[Entity], helper: EntityHelper) -> None:
		definition = self._get_topic_definition(helper.name)
		actions = []
		for one in data:
			row = helper.shaper.serialize(one)
			main_item = self._build_main_item(row, definition)
			lookup_item = self._build_lookup_item(row, main_item)
			actions.extend([
				{
					'Put': {
						'TableName': definition.table_name,
						'Item': self._to_attribute_map(main_item)
					}
				},
				{
					'Put': {
						'TableName': definition.lookup_table_name,
						'Item': self._to_attribute_map(lookup_item)
					}
				}
			])
			if len(actions) == MAX_TRANSACTION_WRITE_ACTIONS:
				self._transact_write_items(actions)
				actions = []
		if len(actions) != 0:
			self._transact_write_items(actions)

	def update_one(self, one: Entity, helper: EntityIdHelper) -> int:
		definition = self._get_topic_definition(helper.name)
		row = helper.shaper.serialize(one)
		entity_id = row.get(helper.idColumnName)
		lookup_item = self._load_lookup_item(definition, entity_id)
		if lookup_item is None:
			return 0
		self._put_row(definition, row, existing_lookup_item=lookup_item)
		return 1

	def update_only(self, updater: EntityUpdater, peace_when_zero: bool = False) -> int:
		rows = self.find(EntityFinder(name=updater.name, shaper=updater.shaper, criteria=updater.criteria))
		found_count = len(rows)
		if found_count == 0:
			if peace_when_zero:
				return 0
			raise EntityNotFoundException(f'Entity not found by updater[{updater}]')
		if found_count > 1:
			raise TooManyEntitiesFoundException(f'Too many entities found by updater[{updater}].')
		definition = self._get_topic_definition(updater.name)
		row = updater.shaper.serialize(rows[0])
		row.update(updater.update)
		lookup_item = self._load_lookup_item(definition, row.get(LOOKUP_ID_ATTR))
		expected = self._extract_equals_map(self._flatten_criteria(updater.criteria))
		try:
			self._put_row(definition, row, expected_equals=expected, existing_lookup_item=lookup_item)
			return 1
		except ClientError as e:
			if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
				if peace_when_zero:
					return 0
				raise EntityNotFoundException(f'Entity not found by updater[{updater}]')
			raise

	def update_only_and_pull(self, updater: EntityUpdater) -> Optional[Entity]:
		rows = self.find(EntityFinder(name=updater.name, shaper=updater.shaper, criteria=updater.criteria))
		if len(rows) == 0:
			return None
		if len(rows) > 1:
			raise TooManyEntitiesFoundException(f'Too many entities found by updater[{updater}].')
		self.update_only(updater)
		return rows[0]

	def update(self, updater: EntityUpdater) -> int:
		rows = self.find(EntityFinder(name=updater.name, shaper=updater.shaper, criteria=updater.criteria))
		definition = self._get_topic_definition(updater.name)
		for row in rows:
			serialized = updater.shaper.serialize(row)
			serialized.update(updater.update)
			self._put_row(
				definition,
				serialized,
				existing_lookup_item=self._load_lookup_item(definition, serialized.get(LOOKUP_ID_ATTR))
			)
		return len(rows)

	def update_and_pull(self, updater: EntityUpdater) -> EntityList:
		rows = self.find(EntityFinder(name=updater.name, shaper=updater.shaper, criteria=updater.criteria))
		if len(rows) == 0:
			return []
		self.update(updater)
		return rows

	def delete_by_id(self, entity_id: EntityId, helper: EntityIdHelper) -> int:
		definition = self._get_topic_definition(helper.name)
		return self._delete_by_lookup_item(definition, self._load_lookup_item(definition, entity_id))

	def delete_by_id_and_pull(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		entity = self.find_by_id(entity_id, helper)
		if entity is None:
			return None
		self.delete_by_id(entity_id, helper)
		return entity

	def delete_only(self, deleter: EntityDeleter) -> int:
		rows = self.find(EntityFinder(name=deleter.name, shaper=deleter.shaper, criteria=deleter.criteria))
		if len(rows) == 0:
			raise EntityNotFoundException(f'Entity not found by deleter[{deleter}].')
		if len(rows) > 1:
			raise TooManyEntitiesFoundException(f'Too many entities found by deleter[{deleter}].')
		definition = self._get_topic_definition(deleter.name)
		row = deleter.shaper.serialize(rows[0])
		lookup_item = self._load_lookup_item(definition, row.get(LOOKUP_ID_ATTR))
		deleted_count = self._delete_by_lookup_item(
			definition,
			lookup_item,
			expected_equals=self._extract_equals_map(self._flatten_criteria(deleter.criteria))
		)
		if deleted_count == 0:
			raise EntityNotFoundException(f'Entity not found by deleter[{deleter}].')
		return deleted_count

	def delete_only_and_pull(self, deleter: EntityDeleter) -> Optional[Entity]:
		rows = self.find(EntityFinder(name=deleter.name, shaper=deleter.shaper, criteria=deleter.criteria))
		if len(rows) == 0:
			return None
		if len(rows) > 1:
			raise TooManyEntitiesFoundException(f'Too many entities found by deleter[{deleter}].')
		row = rows[0]
		self.delete_only(deleter)
		return row

	def delete(self, deleter: EntityDeleter) -> int:
		rows = self.find(EntityFinder(name=deleter.name, shaper=deleter.shaper, criteria=deleter.criteria))
		expected_equals = self._extract_equals_map(self._flatten_criteria(deleter.criteria))
		definition = self._get_topic_definition(deleter.name)
		deleted_count = 0
		for row in rows:
			serialized = deleter.shaper.serialize(row)
			deleted_count += self._delete_by_lookup_item(
				definition,
				self._load_lookup_item(definition, serialized.get(LOOKUP_ID_ATTR)),
				expected_equals=expected_equals
			)
		return deleted_count

	def delete_and_pull(self, deleter: EntityDeleter) -> EntityList:
		rows = self.find(EntityFinder(name=deleter.name, shaper=deleter.shaper, criteria=deleter.criteria))
		if len(rows) == 0:
			return []
		self.delete(deleter)
		return rows

	def find_by_id(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		definition = self._get_topic_definition(helper.name)
		row = self._load_row_by_id(definition, entity_id)
		if row is None:
			return None
		return helper.shaper.deserialize(row)

	def find_and_lock_by_id(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		raise UnexpectedStorageException('Method[find_and_lock_by_id] does not support by Dynamo storage.')

	def find_and_lock_by_id_nowait(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		raise UnexpectedStorageException('Method[find_and_lock_by_id_nowait] does not support by Dynamo storage.')

	def find_one(self, finder: EntityFinder) -> Optional[Entity]:
		rows = self._query_by_definition(
			self._get_topic_definition(finder.name),
			self._flatten_criteria(finder.criteria),
			sort=finder.sort,
			limit=1,
			mode='one'
		)
		if len(rows) == 0:
			return None
		return finder.shaper.deserialize(rows[0])

	def find_one_and_lock_nowait(self, finder: EntityFinder) -> Optional[Entity]:
		raise UnexpectedStorageException('Method[find_one_and_lock_nowait] does not support by Dynamo storage.')

	def find(self, finder: EntityFinder) -> EntityList:
		rows = self._query_by_definition(
			self._get_topic_definition(finder.name),
			self._flatten_criteria(finder.criteria),
			sort=finder.sort,
			mode='many'
		)
		return [finder.shaper.deserialize(row) for row in rows]

	def find_limited(self, finder: EntityLimitedFinder) -> EntityList:
		rows = self._query_by_definition(
			self._get_topic_definition(finder.name),
			self._flatten_criteria(finder.criteria),
			sort=finder.sort,
			limit=finder.limit,
			mode='many'
		)
		return [finder.shaper.deserialize(row) for row in rows]

	def find_for_update_skip_locked(self, finder: EntityLimitedFinder) -> EntityList:
		raise UnexpectedStorageException('Method[find_for_update_skip_locked] does not support by Dynamo storage.')

	def find_distinct_values(self, finder: EntityDistinctValuesFinder) -> EntityList:
		rows = self._query_by_definition(
			self._get_topic_definition(finder.name),
			self._flatten_criteria(finder.criteria),
			sort=finder.sort,
			limit=finder.limit
		)
		seen = set()
		values = []
		for row in rows:
			key = tuple(row.get(column_name) for column_name in finder.distinctColumnNames)
			if key in seen:
				continue
			seen.add(key)
			if finder.distinctValueOnSingleColumn and len(finder.distinctColumnNames) == 1:
				values.append({finder.distinctColumnNames[0]: row.get(finder.distinctColumnNames[0])})
			else:
				values.append({column_name: row.get(column_name) for column_name in finder.distinctColumnNames})
		return values

	def find_straight_values(self, finder: EntityStraightValuesFinder) -> EntityList:
		if any(isinstance(column, EntityStraightAggregateColumn) for column in finder.straightColumns or []):
			raise UnsupportedStraightColumnException(
				'Aggregate straight columns are not supported by current Dynamo storage version.')
		rows = self._query_by_definition(
			self._get_topic_definition(finder.name),
			self._flatten_criteria(finder.criteria),
			sort=finder.sort
		)
		return [{column.alias or column.columnName: row.get(column.columnName) for column in finder.straightColumns or []}
		        for row in rows]

	def find_limited_straight_values(self, finder: EntityLimitedStraightValuesFinder) -> EntityList:
		if any(isinstance(column, EntityStraightAggregateColumn) for column in finder.straightColumns or []):
			raise UnsupportedStraightColumnException(
				'Aggregate straight columns are not supported by current Dynamo storage version.')
		rows = self._query_by_definition(
			self._get_topic_definition(finder.name),
			self._flatten_criteria(finder.criteria),
			sort=finder.sort,
			limit=finder.limit
		)
		return [{column.alias or column.columnName: row.get(column.columnName) for column in finder.straightColumns or []}
		        for row in rows]

	def find_all(self, helper: EntityHelper) -> EntityList:
		raise UnexpectedStorageException('Method[find_all] does not support by Dynamo storage.')

	def page(self, pager: EntityPager) -> DataPage:
		page_size = pager.pageable.pageSize
		if page_size is None or page_size <= 0:
			raise UnexpectedStorageException('Current Dynamo storage requires pageSize for page query.')
		page_number = pager.pageable.pageNumber or 1
		rows = self._query_by_definition(
			self._get_topic_definition(pager.name),
			self._flatten_criteria(pager.criteria),
			sort=pager.sort,
			mode='many'
		)
		count = len(rows)
		if count == 0:
			return DataPage(data=[], pageNumber=1, pageSize=page_size, itemCount=0, pageCount=0)
		page_number, max_page_number = self._compute_page(count, page_size, page_number)
		offset = page_size * (page_number - 1)
		page_rows = rows[offset: offset + page_size]
		return DataPage(
			data=[pager.shaper.deserialize(row) for row in page_rows],
			pageNumber=page_number,
			pageSize=page_size,
			itemCount=count,
			pageCount=max_page_number
		)

	def exists(self, finder: EntityFinder) -> bool:
		return self.find_one(finder) is not None

	def count(self, finder: EntityFinder) -> int:
		rows = self._query_by_definition(
			self._get_topic_definition(finder.name),
			self._flatten_criteria(finder.criteria),
			sort=finder.sort
		)
		return len(rows)


class TopicDataStorageDynamo(StorageDynamo, TopicDataStorageSPI):
	def register_topic(self, topic: Topic, datasource: DataSource) -> None:
		self.topics[topic.topicId] = self._build_topic_definition(topic)

	def _ensure_table_deleted(self, table_name: str) -> None:
		try:
			self.client.delete_table(TableName=table_name)
			self.client.get_waiter('table_not_exists').wait(TableName=table_name)
		except ClientError as e:
			if e.response['Error']['Code'] != 'ResourceNotFoundException':
				raise

	def _build_table_definition(self, definition: DynamoTopicDefinition) -> Dict[str, Any]:
		attribute_definitions = [{'AttributeName': PK_ATTR, 'AttributeType': 'S'}]
		key_schema = [{'AttributeName': PK_ATTR, 'KeyType': 'HASH'}]
		if len(definition.primary_sk_fields) != 0:
			attribute_definitions.append({'AttributeName': SK_ATTR, 'AttributeType': 'S'})
			key_schema.append({'AttributeName': SK_ATTR, 'KeyType': 'RANGE'})
		global_secondary_indexes = []
		for index in definition.indexes:
			attribute_definitions.append({'AttributeName': index.pk_attr, 'AttributeType': 'S'})
			key_schema_for_index = [{'AttributeName': index.pk_attr, 'KeyType': 'HASH'}]
			if index.sk_attr is not None:
				attribute_definitions.append({'AttributeName': index.sk_attr, 'AttributeType': 'S'})
				key_schema_for_index.append({'AttributeName': index.sk_attr, 'KeyType': 'RANGE'})
			global_secondary_indexes.append({
				'IndexName': index.name,
				'KeySchema': key_schema_for_index,
				'Projection': {'ProjectionType': 'ALL'},
				'ProvisionedThroughput': {'ReadCapacityUnits': 1, 'WriteCapacityUnits': 1}
			})
		payload = {
			'TableName': definition.table_name,
			'AttributeDefinitions': attribute_definitions,
			'KeySchema': key_schema
		}
		if self.tableBillingMode == 'PAY_PER_REQUEST':
			payload['BillingMode'] = 'PAY_PER_REQUEST'
		else:
			payload['ProvisionedThroughput'] = {'ReadCapacityUnits': 1, 'WriteCapacityUnits': 1}
		if len(global_secondary_indexes) != 0:
			payload['GlobalSecondaryIndexes'] = global_secondary_indexes
		return payload

	def _lookup_id_attribute_type(self) -> str:
		return 'S'

	def create_topic_entity(self, topic: Topic) -> None:
		definition = self._build_topic_definition(topic)
		try:
			self.client.create_table(**self._build_table_definition(definition))
			self.client.get_waiter('table_exists').wait(TableName=definition.table_name)
		except ClientError as e:
			if e.response['Error']['Code'] != 'ResourceInUseException':
				logger.error(e, exc_info=True, stack_info=True)
				raise
		try:
			self.client.create_table(
				TableName=definition.lookup_table_name,
				AttributeDefinitions=[{'AttributeName': LOOKUP_ID_ATTR, 'AttributeType': self._lookup_id_attribute_type()}],
				KeySchema=[{'AttributeName': LOOKUP_ID_ATTR, 'KeyType': 'HASH'}],
				**(
					{'BillingMode': 'PAY_PER_REQUEST'} if self.tableBillingMode == 'PAY_PER_REQUEST'
					else {'ProvisionedThroughput': {'ReadCapacityUnits': 1, 'WriteCapacityUnits': 1}}
				)
			)
			self.client.get_waiter('table_exists').wait(TableName=definition.lookup_table_name)
		except ClientError as e:
			if e.response['Error']['Code'] != 'ResourceInUseException':
				logger.error(e, exc_info=True, stack_info=True)
				raise

	def update_topic_entity(self, topic: Topic, original_topic: Topic) -> None:
		new_definition = self._build_topic_definition(topic)
		old_definition = self._build_topic_definition(original_topic)
		if new_definition.primary_pk_fields != old_definition.primary_pk_fields or \
				new_definition.primary_sk_fields != old_definition.primary_sk_fields:
			raise UnexpectedStorageException(
				f'Topic[{topic.topicId}] primary key change is not supported by current Dynamo storage version.')
		if [
			(index.name, index.pk_fields, index.sk_fields) for index in new_definition.indexes
		] != [
			(index.name, index.pk_fields, index.sk_fields) for index in old_definition.indexes
		]:
			raise UnexpectedStorageException(
				f'Topic[{topic.topicId}] index evolution is not supported by current Dynamo storage version.')
		if {
			name: (profile.mode, profile.unique, profile.pk_fields, profile.sk_fields, profile.index_name,
			       profile.default_limit, profile.max_limit)
			for name, profile in new_definition.query_profiles.items()
		} != {
			name: (profile.mode, profile.unique, profile.pk_fields, profile.sk_fields, profile.index_name,
			       profile.default_limit, profile.max_limit)
			for name, profile in old_definition.query_profiles.items()
		}:
			raise UnexpectedStorageException(
				f'Topic[{topic.topicId}] query profile evolution is not supported by current Dynamo storage version.')
		self.topics[topic.topicId] = new_definition

	def drop_topic_entity(self, topic: Topic) -> None:
		definition = self._build_topic_definition(topic)
		self._ensure_table_deleted(definition.lookup_table_name)
		self._ensure_table_deleted(definition.table_name)

	def truncate(self, helper: EntityHelper) -> None:
		definition = self._get_topic_definition(helper.name)
		lookup_table = self._lookup_table(definition)
		main_table = self._main_table(definition)
		scan_kwargs = {'ProjectionExpression': f'{LOOKUP_ID_ATTR}, {LOOKUP_MAIN_PK_ATTR}, {LOOKUP_MAIN_SK_ATTR}'}
		last_evaluated_key = None
		while True:
			if last_evaluated_key is not None:
				scan_kwargs['ExclusiveStartKey'] = last_evaluated_key
			response = lookup_table.scan(**scan_kwargs)
			items = response.get('Items', [])
			with main_table.batch_writer() as main_writer:
				with lookup_table.batch_writer() as lookup_writer:
					for item in items:
						main_writer.delete_item(Key=self._main_key_from_lookup(definition, item))
						lookup_writer.delete_item(Key=self._lookup_key(item[LOOKUP_ID_ATTR]))
			last_evaluated_key = response.get('LastEvaluatedKey')
			if last_evaluated_key is None:
				return

	def ask_synonym_factors(self, table_name: str) -> List:
		raise UnexpectedStorageException('Method[ask_synonym_factors] does not support by Dynamo storage.')

	def ask_reflect_factors(self, table_name: str, schema: str) -> List:
		raise UnexpectedStorageException('Method[ask_reflect_factors] does not support by Dynamo storage.')

	def is_free_find_supported(self) -> bool:
		return False

	def append_topic_to_trino(self, topic: Topic) -> None:
		pass

	def drop_topic_from_trino(self, topic: Topic) -> None:
		pass

	def find_sql(self, finder: FreeFinder) -> str:
		raise UnexpectedStorageException('Method[find_sql] does not support by Dynamo storage.')

	def free_find(self, finder: FreeFinder) -> List[Dict[str, Any]]:
		raise UnexpectedStorageException('Method[free_find] does not support by Dynamo storage.')

	def free_page(self, pager: FreePager) -> DataPage:
		raise UnexpectedStorageException('Method[free_page] does not support by Dynamo storage.')

	def free_aggregate_find(self, aggregator: FreeAggregator) -> List[Dict[str, Any]]:
		raise UnexpectedStorageException('Method[free_aggregate_find] does not support by Dynamo storage.')

	def free_aggregate_page(self, pager: FreeAggregatePager) -> DataPage:
		raise UnexpectedStorageException('Method[free_aggregate_page] does not support by Dynamo storage.')
