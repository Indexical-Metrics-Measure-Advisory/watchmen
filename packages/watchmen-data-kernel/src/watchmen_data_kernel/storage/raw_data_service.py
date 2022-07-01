from typing import Any, Dict, List, Optional

from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_model.admin import Factor, FactorType, TopicKind
from watchmen_model.pipeline_kernel import TopicDataColumnNames
from watchmen_storage import EntityCriteriaExpression, EntityRow, EntityShaper
from watchmen_utilities import ArrayHelper
from .data_entity_helper import TopicDataEntityHelper
from .data_service import TopicDataService
from .factor_column_mapper import TopicFactorColumnMapper
from .shaper import TopicShaper


class RawTopicFactorColumnMapper(TopicFactorColumnMapper):
	def get_factors(self, schema: TopicSchema) -> List[Factor]:
		if schema.get_topic().kind == TopicKind.SYNONYM:
			# top level factors are required
			return ArrayHelper(schema.get_topic().factors).filter(lambda x: '.' not in x.name).to_list()
		else:
			# only flatten factors are required
			return ArrayHelper(schema.get_flatten_factors()).map(lambda x: x.get_factor()).to_list()


class RawTopicShaper(TopicShaper):
	def create_factor_column_mapper(self, schema: TopicSchema) -> TopicFactorColumnMapper:
		return RawTopicFactorColumnMapper(schema)

	def serialize(self, data: Dict[str, Any]) -> EntityRow:
		if self.is_synonym():
			row: EntityRow = {}
			ArrayHelper(self.get_mapper().get_factor_names()).each(lambda x: self.serialize_factor(data, x, row))
		else:
			row = self.serialize_fix_columns(data)
			row[TopicDataColumnNames.RAW_TOPIC_DATA.value] = data.get(TopicDataColumnNames.RAW_TOPIC_DATA.value)
			ArrayHelper(self.get_mapper().get_factor_names()).each(lambda x: self.serialize_factor(data, x, row))
		return row

	def deserialize(self, row: EntityRow) -> Dict[str, Any]:
		if self.is_synonym():
			temp: Dict[str, Any] = {}
			# copy columns to temp dict
			ArrayHelper(self.get_mapper().get_column_names()).each(lambda x: self.deserialize_column(row, x, temp))
			data: Dict[str, Any] = {}
			# copy factors which on top level except for object and array type, just like they are flatten
			for k, v in temp.items():
				factor: Optional[Factor] = ArrayHelper(self.get_schema().get_topic().factors) \
					.find(lambda x: x.name == k)
				if factor is not None and factor.type != FactorType.OBJECT and factor.type != FactorType.ARRAY:
					data[k] = v
			# copy whole object as data column
			data[TopicDataColumnNames.RAW_TOPIC_DATA.value] = temp
		else:
			data = self.deserialize_fix_columns(row)
			data[TopicDataColumnNames.RAW_TOPIC_DATA.value] = row.get(TopicDataColumnNames.RAW_TOPIC_DATA.value)
			ArrayHelper(self.get_mapper().get_column_names()).each(lambda x: self.deserialize_column(row, x, data))
		return data


class RawTopicDataEntityHelper(TopicDataEntityHelper):
	def create_entity_shaper(self, schema: TopicSchema) -> EntityShaper:
		return RawTopicShaper(schema)

	def is_versioned(self) -> bool:
		return False

	def find_version(self, data: Dict[str, Any]) -> int:
		"""
		always return -1
		"""
		return -1

	def build_version_criteria(self, data: Dict[str, Any]) -> Optional[EntityCriteriaExpression]:
		return None

	def assign_version(self, data: Dict[str, Any], version: int) -> None:
		"""
		do nothing, raw topic has no version column
		"""
		pass


class RawTopicDataService(TopicDataService):
	def try_to_wrap_to_topic_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
		self.delete_reversed_columns(data)

		def wrap_flatten_factor(factor: Factor, from_data: Dict[str, Any], to_data: Dict[str, Any]) -> None:
			name = factor.name
			# copy flatten value to wrapped data
			to_data[name] = from_data.get(name)
			if name.find('.') != -1 and name in from_data:
				del from_data[name]

		wrapped_data = {TopicDataColumnNames.RAW_TOPIC_DATA.value: data}
		# retrieve flatten factors
		flatten_factors = self.schema.get_flatten_factors()
		ArrayHelper(flatten_factors) \
			.map(lambda x: x.get_factor()) \
			.each(lambda x: wrap_flatten_factor(x, data, wrapped_data))
		return wrapped_data

	def try_to_unwrap_from_topic_data(self, topic_data: Dict[str, Any]) -> Dict[str, Any]:
		unwrapped_data = {}

		# remove flatten factors
		reserved_keys = [
			TopicDataColumnNames.ID.value,
			TopicDataColumnNames.TENANT_ID.value,
			TopicDataColumnNames.INSERT_TIME.value,
			TopicDataColumnNames.UPDATE_TIME.value
		]
		for key, value in topic_data.items():
			if key in reserved_keys:
				unwrapped_data[key] = value

		if TopicDataColumnNames.RAW_TOPIC_DATA.value in topic_data:
			pure_data = topic_data.get(TopicDataColumnNames.RAW_TOPIC_DATA.value)
			if pure_data is not None:
				for key, value in pure_data.items():
					unwrapped_data[key] = value
		return unwrapped_data
