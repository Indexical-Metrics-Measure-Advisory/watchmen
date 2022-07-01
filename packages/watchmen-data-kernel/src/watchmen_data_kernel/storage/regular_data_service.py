from typing import Any, Dict, List, Optional

from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_model.admin import Factor, is_aggregation_topic
from watchmen_model.pipeline_kernel import TopicDataColumnNames
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityRow, EntityShaper
from watchmen_utilities import ArrayHelper
from .data_entity_helper import TopicDataEntityHelper
from .data_service import TopicDataService
from .factor_column_mapper import TopicFactorColumnMapper
from .shaper import TopicShaper


class RegularTopicFactorColumnMapper(TopicFactorColumnMapper):
	def get_factors(self, schema: TopicSchema) -> List[Factor]:
		return ArrayHelper(schema.get_topic().factors).to_list()


class RegularTopicShaper(TopicShaper):
	def create_factor_column_mapper(self, schema: TopicSchema) -> TopicFactorColumnMapper:
		return RegularTopicFactorColumnMapper(schema)

	def serialize(self, data: Dict[str, Any]) -> EntityRow:
		if self.is_synonym():
			row: EntityRow = {}
		else:
			row = self.serialize_fix_columns(data)
			if is_aggregation_topic(self.get_schema().get_topic()):
				row[TopicDataColumnNames.AGGREGATE_ASSIST.value] = data.get(TopicDataColumnNames.AGGREGATE_ASSIST.value)
				row[TopicDataColumnNames.VERSION.value] = data.get(TopicDataColumnNames.VERSION.value)
		ArrayHelper(self.get_mapper().get_factor_names()).each(lambda x: self.serialize_factor(data, x, row))
		return row

	def deserialize(self, row: EntityRow) -> Dict[str, Any]:
		if self.is_synonym():
			data: Dict[str, Any] = {}
		else:
			data = self.deserialize_fix_columns(row)
			if is_aggregation_topic(self.get_schema().get_topic()):
				data[TopicDataColumnNames.AGGREGATE_ASSIST.value] = row.get(TopicDataColumnNames.AGGREGATE_ASSIST.value)
				data[TopicDataColumnNames.VERSION.value] = row.get(TopicDataColumnNames.VERSION.value)
		ArrayHelper(self.get_mapper().get_column_names()).each(lambda x: self.deserialize_column(row, x, data))
		return data


class RegularTopicDataEntityHelper(TopicDataEntityHelper):
	def create_entity_shaper(self, schema: TopicSchema) -> EntityShaper:
		return RegularTopicShaper(schema)

	def is_versioned(self) -> bool:
		return is_aggregation_topic(self.get_schema().get_topic())

	def find_version(self, data: Dict[str, Any]) -> int:
		if is_aggregation_topic(self.get_schema().get_topic()):
			return data.get(TopicDataColumnNames.VERSION.value)
		else:
			return -1

	def build_version_criteria(self, data: Dict[str, Any]) -> Optional[EntityCriteriaExpression]:
		return EntityCriteriaExpression(
			left=ColumnNameLiteral(columnName=TopicDataColumnNames.VERSION.value), right=self.find_version(data))

	def assign_version(self, data: Dict[str, Any], version: int):
		if is_aggregation_topic(self.get_schema().get_topic()):
			data[TopicDataColumnNames.VERSION.value] = version


class RegularTopicDataService(TopicDataService):
	def try_to_wrap_to_topic_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
		self.delete_reversed_columns(data)
		return data

	def try_to_unwrap_from_topic_data(self, topic_data: Dict[str, Any]) -> Dict[str, Any]:
		return topic_data
