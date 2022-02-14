from abc import abstractmethod
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.admin import Factor, Topic
from watchmen_reactor.common import ReactorException
from watchmen_reactor.topic_schema import ColumnNames, TopicSchema
from watchmen_storage import EntityHelper, EntityIdHelper, EntityRow, EntityShaper, SnowflakeGenerator, \
	TransactionalStorageSPI
from watchmen_utilities import ArrayHelper, get_current_time_in_seconds, is_blank


class TopicFactorColumnMapper:
	def __init__(self, schema: TopicSchema):
		self.topic = schema.topic
		self.factors = self.get_factors(schema)
		self.factor_to_column = self.create_factor_to_column_dict(self.factors)
		self.factor_names = list(self.factor_to_column.keys())
		self.column_to_factor = dict((v, k) for k, v in self.factor_to_column.items())
		self.column_names = list(self.column_to_factor.keys())

	@abstractmethod
	def get_factors(self, schema: TopicSchema) -> List[Factor]:
		"""
		get concerned factors
		"""
		pass

	# noinspection PyMethodMayBeStatic
	def create_factor_to_column_dict(self, factors: List[Factor]) -> Dict[str, str]:
		"""
		create a dictionary which mapping factor name(key) to column name(value
		"""

		def put_into_map(a_dict: Dict[str, str], factor: Factor) -> Dict[str, str]:
			factor_name = '' if is_blank(factor.name) else factor.name.strip()
			a_dict[factor_name] = factor_name.lower()
			return a_dict

		return ArrayHelper(factors).reduce(put_into_map, {})

	def get_column_name(self, factor_name: str):
		return self.factor_to_column.get(factor_name)

	def get_column_names(self) -> List[str]:
		return self.column_names

	def get_factor_name(self, column_name: str):
		return self.column_to_factor.get(column_name)

	def get_factor_names(self) -> List[str]:
		return self.factor_names


class TopicShaper(EntityShaper):
	def __init__(self, schema: TopicSchema):
		self.schema = schema
		self.mapper = self.create_factor_column_mapper(schema)

	@abstractmethod
	def create_factor_column_mapper(self, schema: TopicSchema) -> TopicFactorColumnMapper:
		pass

	def serialize_factor(self, data: Dict[str, Any], factor_name: str, row: EntityRow) -> None:
		value = data.get(factor_name)
		column_name = self.mapper.get_column_name(factor_name)
		row[column_name] = value

	def deserialize_column(self, row: EntityRow, column_name: str, data: Dict[str, Any]) -> None:
		value = row.get(column_name)
		factor_name = self.mapper.get_factor_name(column_name)
		data[factor_name] = value


class TopicDataEntityHelper:
	def __init__(self, schema: TopicSchema):
		self.entity_name = f'topic_{schema.topic.name.strip().lower()}'
		self.shaper = self.create_entity_shaper(schema)
		self.entity_helper = EntityHelper(name=self.entity_name, shaper=self.shaper)
		self.entity_id_helper = EntityIdHelper(
			name=self.entity_name,
			shaper=self.shaper,
			idColumnName=ColumnNames.ID
		)

	def get_entity_name(self) -> str:
		return self.entity_name

	@abstractmethod
	def create_entity_shaper(self, schema: TopicSchema) -> EntityShaper:
		pass

	def get_entity_helper(self):
		return self.entity_helper

	def get_entity_id_helper(self):
		return self.entity_id_helper


class TopicDataService:
	def __init__(
			self, topic_schema: TopicSchema, storage: TransactionalStorageSPI, principal_service: PrincipalService):
		self.topic_schema = topic_schema
		self.data_entity_helper = self.create_data_entity_helper(topic_schema)
		self.storage = storage
		self.principal_service = principal_service
		self.snowflake_generator = ask_snowflake_generator()

	def get_schema(self) -> TopicSchema:
		return self.topic_schema

	def get_topic(self) -> Topic:
		return self.topic_schema.get_topic()

	def get_storage(self) -> TransactionalStorageSPI:
		return self.storage

	def get_snowflake_generator(self) -> SnowflakeGenerator:
		return self.snowflake_generator

	def get_principal_service(self) -> PrincipalService:
		return self.principal_service

	# noinspection PyMethodMayBeStatic
	def now(self) -> datetime:
		"""
		get current time in seconds
		"""
		return get_current_time_in_seconds()

	def get_entity_helper(self):
		return self.data_entity_helper.get_entity_helper()

	@abstractmethod
	def create_data_entity_helper(self, schema: TopicSchema) -> TopicDataEntityHelper:
		pass

	@abstractmethod
	def create(self, data: Dict[str, Any]):
		try:
			self.get_storage().connect()
			self.get_storage().insert_one(data, self.get_entity_helper())
		except Exception as e:
			topic = self.get_topic()
			raise ReactorException(f'Failed to create data[{data}] on topic[id={topic.topicId}, name={topic.name}].')

	@abstractmethod
	def find(self, data: Dict[str, Any]):
		pass

	@abstractmethod
	def update(self, data: Dict[str, Any]):
		pass

	@abstractmethod
	def delete(self, data: Dict[str, Any]):
		pass

	# noinspection PyMethodMayBeStatic
	def find_data_id(self, data: Dict[str, Any]) -> Tuple[bool, Optional[int]]:
		"""
		find data if from given data dictionary.
		"""
		id_ = data.get(ColumnNames.ID)
		return id_ is not None, id_
