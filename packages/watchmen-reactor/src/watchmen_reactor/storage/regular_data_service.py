from typing import Any, Dict, List

from watchmen_model.admin import Factor
from watchmen_reactor.topic_schema import ColumnNames, TopicSchema
from watchmen_storage import EntityRow, EntityShaper
from watchmen_utilities import ArrayHelper
from .data_entity_helper import TopicDataEntityHelper
from .data_service import TopicDataService
from .factor_column_mapper import TopicFactorColumnMapper
from .shaper import TopicShaper


class RegularTopicFactorColumnMapper(TopicFactorColumnMapper):
	def get_factors(self, schema: TopicSchema) -> List[Factor]:
		return ArrayHelper(schema.get_topic().factors).map(lambda x: x.get_factor()).to_list()


class RegularTopicShaper(TopicShaper):
	def create_factor_column_mapper(self, schema: TopicSchema) -> TopicFactorColumnMapper:
		return RegularTopicFactorColumnMapper(schema)

	def serialize(self, data: Dict[str, Any]) -> EntityRow:
		row = self.serialize_fix_columns(data)
		if self.schema.is_aggregation_topic():
			row[ColumnNames.AGGREGATE_ASSIST] = data.get(ColumnNames.AGGREGATE_ASSIST)
			row[ColumnNames.VERSION] = data.get(ColumnNames.VERSION)
		ArrayHelper(self.mapper.get_factor_names()).each(lambda x: self.serialize_factor(data, x, row))
		return row

	def deserialize(self, row: EntityRow) -> Dict[str, Any]:
		data = self.deserialize_fix_columns(row)
		if self.schema.is_aggregation_topic():
			row[ColumnNames.AGGREGATE_ASSIST] = data.get(ColumnNames.AGGREGATE_ASSIST)
			row[ColumnNames.VERSION] = data.get(ColumnNames.VERSION)
		ArrayHelper(self.mapper.get_column_names()).each(lambda x: self.deserialize_column(row, x, data))
		return data


class RegularTopicDataEntityHelper(TopicDataEntityHelper):
	def create_entity_shaper(self, schema: TopicSchema) -> EntityShaper:
		return RegularTopicShaper(schema)

	def find_version(self, data: Dict[str, Any]) -> int:
		if self.get_schema().is_aggregation_topic():
			return data.get(ColumnNames.VERSION)
		else:
			return -1

	def assign_version(self, data: Dict[str, Any], version: int):
		if self.get_schema().is_aggregation_topic():
			data[ColumnNames.VERSION] = version


class RegularTopicDataService(TopicDataService):
	pass
