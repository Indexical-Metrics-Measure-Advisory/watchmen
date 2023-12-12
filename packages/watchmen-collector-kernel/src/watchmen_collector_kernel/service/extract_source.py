import json
from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any, Tuple
from logging import getLogger

from watchmen_data_kernel.meta import TopicService

from watchmen_model.system import DataSource, DataSourceType

from watchmen_auth import fake_tenant_admin
from watchmen_data_kernel.service.storage_helper import get_data_source_service
from .extract_spi import ExtractorSPI
from .extract_utils import build_criteria_by_primary_key
from watchmen_collector_kernel.model import CollectorTableConfig
from watchmen_data_kernel.service import ask_topic_storage, ask_topic_data_service
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_model.admin import Topic, TopicKind, Factor, TopicType
from watchmen_storage import EntityCriteria, EntityStraightColumn, DataSourceHelper, \
	UnexpectedStorageException, ColumnNameLiteral, EntityCriteriaExpression, EntityDeleter, EntityIdHelper
from watchmen_utilities import get_current_time_in_seconds, ArrayHelper
from watchmen_collector_kernel.cache import CollectorCacheService
from ..common import CollectorKernelException

logger = getLogger(__name__)


class LinkNode:

	def __init__(self, item: str):
		self.item = item
		self.next = None


class LinkList:

	def __init__(self):
		self.head = LinkNode("")

	def create_tail(self, li) -> LinkNode:
		self.head = LinkNode(li[0])
		tail = self.head
		for element in li[1:]:
			node = LinkNode(element)
			tail.next = node
			tail = node
		return self.head


class SourceExtractor(ExtractorSPI, ABC):

	def __init__(self, config: CollectorTableConfig):
		self.config = config
		self.principal_service = fake_tenant_admin(config.tenantId)
		self.topic = self.build_topic_by_config(self.config)
		self.storage = ask_topic_storage(self.topic, self.principal_service)
		self.storage.register_topic(self.topic)
		self.service = ask_topic_data_service(TopicSchema(self.topic), self.storage, self.principal_service)

	# noinspection PyMethodMayBeStatic
	def fake_topic_id(self, config_id: str) -> str:
		return f'f-{config_id}'

	@abstractmethod
	def fake_extracted_table_to_topic(self, config: CollectorTableConfig) -> Topic:
		pass

	# noinspection PyMethodMayBeStatic
	def filter_ignored_columns(self, factors: List[Factor], config: CollectorTableConfig) -> List[Factor]:
		ignored_columns = config.ignoredColumns

		def filter_column(factor: Factor) -> bool:
			if factor.name.lower() in ignored_columns:
				return False
			else:
				return True

		return ArrayHelper(factors).filter(lambda factor: filter_column(factor)).to_list()

	def build_topic_by_config(self, config: CollectorTableConfig) -> Topic:
		topic = CollectorCacheService.collector_topic().get_topic_by_id(self.fake_topic_id(config.configId))
		if topic is not None:
			return topic

		topic = self.fake_extracted_table_to_topic(self.config)
		CollectorCacheService.collector_topic().put_topic_by_id(topic)
		return topic

	def find_primary_keys_by_criteria(self, criteria: EntityCriteria) -> Optional[List[Dict[str, Any]]]:
		return self.lower_key(self.service.find_straight_values(
			criteria=criteria,
			columns=ArrayHelper(self.config.primaryKey).map(
				lambda column_name: EntityStraightColumn(columnName=column_name)
			).to_list()
		))

	def find_one_record_of_table(self) -> Optional[List[Dict[str, Any]]]:
		result = self.service.find_limited_values(criteria=[], limit=1)
		if result:
			return self.process_json_columns(self.lower_key(result))
		else:
			return [ArrayHelper(self.topic.factors).to_map(lambda factor: factor.name.lower(), lambda factor: None)]

	def find_one_by_primary_keys(self, data_id: Dict) -> Optional[Dict[str, Any]]:
		results = self.service.find(build_criteria_by_primary_key(data_id))
		if len(results) == 1:
			return self.process_json_columns(self.lower_key(results))[0]
		elif len(results) == 0:
			return None
		else:
			raise RuntimeError(f'too many results with {data_id} find')

	def find_records_by_criteria(self, criteria: EntityCriteria) -> Optional[List[Dict[str, Any]]]:
		data_ = self.lower_key(self.service.find(criteria))
		return self.process_json_columns(data_)

	def delete_one_by_primary_keys(self, data_id: Dict):
		pass

	# noinspection PyMethodMayBeStatic
	def lower_key(self, data_: List) -> Optional[List[Dict]]:
		return ArrayHelper(data_).map(
			lambda row: {k.lower(): v for k, v in row.items()}).to_list()

	# noinspection PyMethodMayBeStatic
	def process_json_columns(self, data_: List) -> Optional[List[Dict]]:
		json_columns = self.config.jsonColumns

		def process_json_ignored(ignored_path_list: List[str], data_dict: Dict) -> Dict:

			def ignored_path(data_need_ignored: Dict, json_ignored_path: str) -> Dict:
				ignored_list = json_ignored_path.split(".")
				ignored_link_head = LinkList().create_tail(ignored_list)

				def ignored(data_ignored: Dict, node: LinkNode) -> Optional[Dict]:
					if data_ignored is None:
						return None
					if node.item in data_ignored:
						if node.next is not None:
							temp = data_ignored[node.item]
							if isinstance(temp, List):
								data_ignored[node.item] = ArrayHelper(temp).map(
									lambda item: ignored(item, node.next)
								).to_list()
							else:
								data_ignored[node.item] = ignored(temp, node.next)
							return data_ignored
						else:
							del data_ignored[node.item]
							return data_ignored
					else:
						return data_ignored

				return ignored(data_need_ignored, ignored_link_head)

			return ArrayHelper(ignored_path_list).reduce(ignored_path, data_dict)

		def process_need_flatten(data_need_flatten: Optional[Tuple[List[Tuple[str, int]], str]]) -> Optional[str]:
			if isinstance(data_need_flatten, List):
				return ','.join(data_need_flatten)
			else:
				return data_need_flatten

		def process_flatten_path(flatten_path_list: List[str], data_dict: Dict) -> Dict:

			def flatten_path(data_need_flatten: Dict, json_flatten_path: str) -> Dict:
				flatten_list = json_flatten_path.split(".")
				flatten_link_head = LinkList().create_tail(flatten_list)

				def flatten(data_flattened: Dict, node: LinkNode) -> Optional[Dict]:
					if data_flattened is None:
						return None
					if node.item in data_flattened:
						if node.next is not None:
							temp = data_flattened[node.item]
							if isinstance(temp, List):
								data_flattened[node.item] = ArrayHelper(temp).map(
									lambda item: flatten(item, node.next)
								).to_list()
							else:
								data_flattened[node.item] = flatten(temp, node.next)
							return data_flattened
						else:
							data_flattened[node.item] = process_need_flatten(data_flattened[node.item])
							return data_flattened
					else:
						return data_flattened

				return flatten(data_need_flatten, flatten_link_head)

			return ArrayHelper(flatten_path_list).reduce(flatten_path, data_dict)

		def process_json_path(inner_json_path_list: List[str], data_dict: Dict) -> Dict:

			def json_path(data_need_load: Dict, inner_json_path: str) -> Dict:
				json_path_list = inner_json_path.split(".")
				json_path_link_head = LinkList().create_tail(json_path_list)

				def load(data_loaded: Dict, node: LinkNode) -> Optional[Dict]:
					if data_loaded is None:
						return None
					if node.item in data_loaded:
						if node.next is not None:
							temp = data_loaded[node.item]
							if isinstance(temp, List):
								data_loaded[node.item] = ArrayHelper(temp).map(
									lambda item: load(item, node.next)
								).to_list()
							else:
								data_loaded[node.item] = load(temp, node.next)
							return data_loaded
						else:
							if data_loaded[node.item]:
								try:
									data_loaded[node.item] = json.loads(data_loaded[node.item])
									return data_loaded
								except ValueError:
									logger.error(f'json node name: {node.item}')
					else:
						return data_loaded

				return load(data_need_load, json_path_link_head)

			return ArrayHelper(inner_json_path_list).reduce(json_path, data_dict)

		def change_column_value(row: Dict) -> Dict:
			for key, value in row.items():
				for column in json_columns:
					if key == column.columnName:
						if value:
							if isinstance(value, str) or isinstance(value, bytes) or isinstance(value, bytearray):
								tmp_data = json.loads(value)
							elif isinstance(value, Dict):
								tmp_data = value
							else:
								raise ValueError(
									f'table_name: {self.config.tableName}, column: {key}, value: {value}, is not json string')

							if column.needFlatten:
								tmp_data = process_need_flatten(tmp_data)
							else:
								if column.ignoredPath:
									tmp_data = process_json_ignored(column.ignoredPath, tmp_data)

								if column.flattenPath:
									tmp_data = process_flatten_path(column.flattenPath, tmp_data)

								if column.jsonPath:
									tmp_data = process_json_path(column.jsonPath, tmp_data)

							row[key] = tmp_data
						else:
							pass
			return row

		if json_columns:
			return ArrayHelper(data_).map(lambda row: change_column_value(row)).to_list()
		else:
			return data_


class SourceTableExtractor(SourceExtractor):

	def __init__(self, config: CollectorTableConfig):
		super().__init__(config)

	def fake_extracted_table_to_topic(self, config: CollectorTableConfig) -> Topic:
		#  Fake synonym topic to visit source table
		topic = Topic(topicId=self.fake_topic_id(config.configId),
		              name=config.tableName,
		              dataSourceId=config.dataSourceId,
		              kind=TopicKind.SYNONYM,
		              tenantId=self.principal_service.tenantId
		              )
		topic_storage = ask_topic_storage(topic, self.principal_service)
		factors = topic_storage.ask_reflect_factors(config.tableName, self.get_schema(topic))
		topic.factors = self.filter_ignored_columns(factors, config) if config.ignoredColumns else factors
		now = get_current_time_in_seconds()
		topic.createdAt = now
		topic.createdBy = self.principal_service.get_user_id()
		topic.lastModifiedAt = now
		topic.lastModifiedBy = self.principal_service.get_user_id()
		return topic

	def get_schema(self, topic: Topic) -> str:
		datasource = get_data_source_service(self.principal_service).find_by_id(topic.dataSourceId)
		return self.get_schema_from_datasource(datasource)

	# noinspection PyMethodMayBeStatic
	def get_schema_from_datasource(self, datasource: DataSource) -> str:
		schema = DataSourceHelper.find_param(datasource.params, "schema")
		return schema if schema else datasource.name


class SourceS3Extractor(SourceExtractor):

	def __init__(self, config: CollectorTableConfig):
		super().__init__(config)

	def fake_extracted_table_to_topic(self, config: CollectorTableConfig) -> Topic:
		#  Fake synonym topic to visit source table
		topic = Topic(topicId=self.fake_topic_id(config.configId),
		              name=config.tableName,
		              type=TopicType.RAW,
		              dataSourceId=config.dataSourceId,
		              kind=TopicKind.SYNONYM,
		              tenantId=self.principal_service.tenantId
		              )
		now = get_current_time_in_seconds()
		topic.createdAt = now
		topic.createdBy = self.principal_service.get_user_id()
		topic.lastModifiedAt = now
		topic.lastModifiedBy = self.principal_service.get_user_id()
		return topic

	def find_primary_keys_by_criteria(self, criteria: EntityCriteria) -> Optional[List[Dict[str, Any]]]:
		return self.service.find_straight_values(
			criteria=criteria,
			columns=ArrayHelper(self.config.primaryKey).map(
				lambda column_name: EntityStraightColumn(columnName=column_name)
			).to_list()
		)

	def find_one_record_of_table(self) -> Optional[List[Dict[str, Any]]]:
		result = self.service.find_limited_values(criteria=[], limit=1)
		if result:
			return self.process_json_columns(result)
		else:
			return [ArrayHelper(self.topic.factors).to_map(lambda factor: factor.name, lambda factor: None)]

	def find_one_by_primary_keys(self, data_id: Dict) -> Optional[Dict[str, Any]]:
		result = self.service.find_data_by_id(self.build_s3_key_by_primary_key(data_id))
		if result:
			return self.process_json_columns([result])[0]
		else:
			return None

	# noinspection PyMethodMayBeStatic
	def build_s3_key_by_primary_key(self, data_id: Dict):
		if len(data_id) == 1:
			return next(iter(data_id.values()))
		else:
			raise CollectorKernelException(f"{data_id} is not supported by build s3 key")

	def find_records_by_criteria(self, criteria: EntityCriteria) -> Optional[List[Dict[str, Any]]]:
		raise UnexpectedStorageException('Method[find_records_by_criteria] does not support by S3 extractor.')

	def delete_one_by_primary_keys(self, data_id: Dict):
		key = self.build_s3_key_by_primary_key(data_id)
		# S3 storage don't need transaction
		self.storage.delete_by_id(key, EntityIdHelper())


class TopicTableExtractor(SourceExtractor):

	def __init__(self, config: CollectorTableConfig):
		super().__init__(config)

	# noinspection PyMethodMayBeStatic
	def get_topic_name_by_table_name(self, table_name: str) -> str:
		return table_name.removeprefix("topic_")

	def fake_extracted_table_to_topic(self, config: CollectorTableConfig) -> Topic:
		schema: TopicSchema = TopicService(self.principal_service).find_schema_by_name(self.get_topic_name_by_table_name(config.tableName),
		                                                                               config.tenantId)
		return schema.topic

	def find_primary_keys_by_criteria(self, criteria: EntityCriteria) -> Optional[List[Dict[str, Any]]]:
		return self.service.find_straight_values(
			criteria=criteria,
			columns=ArrayHelper(self.config.primaryKey).map(
				lambda column_name: EntityStraightColumn(columnName=column_name)
			).to_list()
		)

	def find_one_record_of_table(self) -> Optional[List[Dict[str, Any]]]:
		result = self.service.find_limited_values(criteria=[], limit=1)
		if result:
			return self.process_json_columns(result)
		else:
			return [ArrayHelper(self.topic.factors).to_map(lambda factor: factor.name, lambda factor: None)]

	def find_one_by_primary_keys(self, data_id: Dict) -> Optional[Dict[str, Any]]:
		results = self.service.find(build_criteria_by_primary_key(data_id))
		if len(results) == 1:
			return self.process_json_columns(results)[0]
		elif len(results) == 0:
			return None
		else:
			raise RuntimeError(f'too many results with {data_id} find')

	def find_records_by_criteria(self, criteria: EntityCriteria) -> Optional[List[Dict[str, Any]]]:
		data_ = self.service.find(criteria)
		return self.process_json_columns(data_)


def ask_source_extractor(config: CollectorTableConfig) -> ExtractorSPI:
	if config.configId.startswith("f-"):
		return TopicTableExtractor(config)
	else:
		data_source_id = config.dataSourceId
		principal_service = fake_tenant_admin(config.tenantId)
		data_source = get_data_source_service(principal_service).find_by_id(data_source_id)
		if data_source.dataSourceType in (
				DataSourceType.MYSQL, DataSourceType.ORACLE, DataSourceType.MYSQL, DataSourceType.POSTGRESQL):
			return SourceTableExtractor(config)
		elif data_source.dataSourceType in (DataSourceType.S3, DataSourceType.OSS):
			return SourceS3Extractor(config)
		else:
			raise Exception(f"{data_source.dataSourceType} is not supported")
