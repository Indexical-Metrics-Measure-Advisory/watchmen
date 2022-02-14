from typing import Any, Dict, List

from watchmen_model.admin import Factor
from watchmen_reactor.topic_schema import ColumnNames, TopicSchema
from watchmen_storage import EntityRow, EntityShaper
from watchmen_utilities import ArrayHelper
from .data_entity_helper import TopicDataEntityHelper
from .data_service import TopicDataService
from .factor_column_mapper import TopicFactorColumnMapper
from .shaper import TopicShaper
from ..common import ReactorException


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

	def assign_version(self, data: Dict[str, Any], version: int):
		if self.get_schema().is_aggregation_topic():
			data[ColumnNames.VERSION] = version

	def increase_version(self, data: Dict[str, Any]) -> int:
		if self.get_schema().is_aggregation_topic():
			old_version = data.get(ColumnNames.VERSION)
			if old_version is None:
				topic = self.get_topic()
				raise ReactorException(
					f'Version not found from data[{data}] on topic[id={topic.topicId}, name={topic.name}].')
			new_version = old_version + 1
			data[ColumnNames.VERSION] = new_version
			return new_version
		else:
			return super().increase_version(data)


class RegularTopicDataService(TopicDataService):
	pass
