from abc import abstractmethod
from typing import Any, Dict

from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_model.admin import TopicKind
from watchmen_model.pipeline_kernel import TopicDataColumnNames
from watchmen_storage import EntityRow, EntityShaper
from .factor_column_mapper import TopicFactorColumnMapper


class TopicShaper(EntityShaper):
	def __init__(self, schema: TopicSchema):
		self.schema = schema
		self.mapper = self.create_factor_column_mapper(schema)

	def get_schema(self) -> TopicSchema:
		return self.schema

	def is_synonym(self) -> bool:
		return self.get_schema().get_topic().kind == TopicKind.SYNONYM

	@abstractmethod
	def create_factor_column_mapper(self, schema: TopicSchema) -> TopicFactorColumnMapper:
		pass

	def get_mapper(self) -> TopicFactorColumnMapper:
		return self.mapper

	# noinspection PyMethodMayBeStatic
	def serialize_fix_columns(self, data: Dict[str, Any]) -> EntityRow:
		return {
			TopicDataColumnNames.ID.value: data.get(TopicDataColumnNames.ID.value),
			TopicDataColumnNames.TENANT_ID.value: data.get(TopicDataColumnNames.TENANT_ID.value),
			TopicDataColumnNames.INSERT_TIME.value: data.get(TopicDataColumnNames.INSERT_TIME.value),
			TopicDataColumnNames.UPDATE_TIME.value: data.get(TopicDataColumnNames.UPDATE_TIME.value)
		}

	# noinspection PyMethodMayBeStatic
	def deserialize_fix_columns(self, row: EntityRow) -> Dict[str, Any]:
		return {
			TopicDataColumnNames.ID.value: row.get(TopicDataColumnNames.ID.value),
			TopicDataColumnNames.TENANT_ID.value: row.get(TopicDataColumnNames.TENANT_ID.value),
			TopicDataColumnNames.INSERT_TIME.value: row.get(TopicDataColumnNames.INSERT_TIME.value),
			TopicDataColumnNames.UPDATE_TIME.value: row.get(TopicDataColumnNames.UPDATE_TIME.value)
		}

	def serialize_factor(self, data: Dict[str, Any], factor_name: str, row: EntityRow) -> None:
		value = data.get(factor_name)
		column_name = self.get_mapper().get_column_name(factor_name)
		row[column_name] = value

	def deserialize_column(self, row: EntityRow, column_name: str, data: Dict[str, Any]) -> None:
		value = row.get(column_name)
		factor_name = self.get_mapper().get_factor_name(column_name)
		data[factor_name] = value
