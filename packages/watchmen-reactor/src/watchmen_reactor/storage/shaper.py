from abc import abstractmethod
from typing import Any, Dict

from watchmen_reactor.topic_schema import ColumnNames, TopicSchema
from watchmen_storage import EntityRow, EntityShaper
from .factor_column_mapper import TopicFactorColumnMapper


class TopicShaper(EntityShaper):
	def __init__(self, schema: TopicSchema):
		self.schema = schema
		self.mapper = self.create_factor_column_mapper(schema)

	@abstractmethod
	def create_factor_column_mapper(self, schema: TopicSchema) -> TopicFactorColumnMapper:
		pass

	# noinspection PyMethodMayBeStatic
	def serialize_fix_columns(self, data: Dict[str, Any]) -> EntityRow:
		return {
			ColumnNames.ID: data.get(ColumnNames.ID),
			ColumnNames.TENANT_ID: data.get(ColumnNames.TENANT_ID),
			ColumnNames.INSERT_TIME: data.get(ColumnNames.INSERT_TIME),
			ColumnNames.UPDATE_TIME: data.get(ColumnNames.UPDATE_TIME)
		}

	# noinspection PyMethodMayBeStatic
	def deserialize_fix_columns(self, row: EntityRow) -> Dict[str, Any]:
		return {
			ColumnNames.ID: row.get(ColumnNames.ID),
			ColumnNames.TENANT_ID: row.get(ColumnNames.TENANT_ID),
			ColumnNames.INSERT_TIME: row.get(ColumnNames.INSERT_TIME),
			ColumnNames.UPDATE_TIME: row.get(ColumnNames.UPDATE_TIME)
		}

	def serialize_factor(self, data: Dict[str, Any], factor_name: str, row: EntityRow) -> None:
		value = data.get(factor_name)
		column_name = self.mapper.get_column_name(factor_name)
		row[column_name] = value

	def deserialize_column(self, row: EntityRow, column_name: str, data: Dict[str, Any]) -> None:
		value = row.get(column_name)
		factor_name = self.mapper.get_factor_name(column_name)
		data[factor_name] = value
