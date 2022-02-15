from typing import Any, Dict, List

from watchmen_model.admin import Factor
from watchmen_model.reactor import TopicDataColumnNames
from watchmen_reactor.topic_schema import TopicSchema
from watchmen_storage import EntityRow, EntityShaper
from watchmen_utilities import ArrayHelper
from .data_entity_helper import TopicDataEntityHelper
from .data_service import TopicDataService
from .factor_column_mapper import TopicFactorColumnMapper
from .shaper import TopicShaper


class RawTopicFactorColumnMapper(TopicFactorColumnMapper):
	def get_factors(self, schema: TopicSchema) -> List[Factor]:
		return ArrayHelper(schema.get_flatten_factors()).map(lambda x: x.get_factor()).to_list()


class RawTopicShaper(TopicShaper):
	def create_factor_column_mapper(self, schema: TopicSchema) -> TopicFactorColumnMapper:
		return RawTopicFactorColumnMapper(schema)

	def serialize(self, data: Dict[str, Any]) -> EntityRow:
		row = self.serialize_fix_columns(data)
		row[TopicDataColumnNames.RAW_TOPIC_DATA.value] = data.get(TopicDataColumnNames.RAW_TOPIC_DATA.value)
		ArrayHelper(self.get_mapper().get_factor_names()).each(lambda x: self.serialize_factor(data, x, row))
		return row

	def deserialize(self, row: EntityRow) -> Dict[str, Any]:
		data = self.deserialize_fix_columns(row)
		data[TopicDataColumnNames.RAW_TOPIC_DATA.value] = row.get(TopicDataColumnNames.RAW_TOPIC_DATA.value)
		ArrayHelper(self.get_mapper().get_column_names()).each(lambda x: self.deserialize_column(row, x, data))
		return data


class RawTopicDataEntityHelper(TopicDataEntityHelper):
	def create_entity_shaper(self, schema: TopicSchema) -> EntityShaper:
		return RawTopicShaper(schema)

	def find_version(self, data: Dict[str, Any]) -> int:
		"""
		always return -1
		"""
		return -1

	def assign_version(self, data: Dict[str, Any], version: int) -> None:
		"""
		do nothing, raw topic has no version column
		"""
		pass


class RawTopicDataService(TopicDataService):
	pass
