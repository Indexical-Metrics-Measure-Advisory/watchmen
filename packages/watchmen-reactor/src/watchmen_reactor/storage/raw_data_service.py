from typing import Any, Dict, List

from watchmen_model.admin import Factor
from watchmen_reactor.topic_schema import ColumnNames, TopicSchema
from watchmen_storage import EntityRow, EntityShaper
from watchmen_utilities import ArrayHelper
from .data_service import TopicDataEntityHelper, TopicDataService, TopicFactorColumnMapper, TopicShaper


class RawTopicFactorColumnMapper(TopicFactorColumnMapper):
	def get_factors(self, schema: TopicSchema) -> List[Factor]:
		return ArrayHelper(schema.get_flatten_factors()).map(lambda x: x.get_factor()).to_list()


class RawTopicShaper(TopicShaper):
	def create_factor_column_mapper(self, schema: TopicSchema) -> TopicFactorColumnMapper:
		return RawTopicFactorColumnMapper(schema)

	def serialize(self, data: Dict[str, Any]) -> EntityRow:
		row = {
			ColumnNames.ID: data.get(ColumnNames.ID),
			ColumnNames.RAW_TOPIC_DATA: data.get(ColumnNames.RAW_TOPIC_DATA),
			ColumnNames.TENANT_ID: data.get(ColumnNames.TENANT_ID),
			ColumnNames.INSERT_TIME: data.get(ColumnNames.INSERT_TIME),
			ColumnNames.UPDATE_TIME: data.get(ColumnNames.UPDATE_TIME)
		}
		ArrayHelper(self.mapper.get_factor_names()).each(lambda x: self.serialize_factor(data, x, row))
		return row

	def deserialize(self, row: EntityRow) -> Dict[str, Any]:
		data = {
			ColumnNames.ID: row.get(ColumnNames.ID),
			ColumnNames.RAW_TOPIC_DATA: row.get(ColumnNames.RAW_TOPIC_DATA),
			ColumnNames.TENANT_ID: row.get(ColumnNames.TENANT_ID),
			ColumnNames.INSERT_TIME: row.get(ColumnNames.INSERT_TIME),
			ColumnNames.UPDATE_TIME: row.get(ColumnNames.UPDATE_TIME)
		}
		ArrayHelper(self.mapper.get_column_names()).each(lambda x: self.deserialize_column(row, x, data))
		return data


class RawTopicDataEntityHelper(TopicDataEntityHelper):
	def create_entity_shaper(self, schema: TopicSchema) -> EntityShaper:
		return RawTopicShaper(schema)


class RawTopicDataService(TopicDataService):
	def create_data_entity_helper(self, schema: TopicSchema) -> TopicDataEntityHelper:
		return RawTopicDataEntityHelper(schema)
