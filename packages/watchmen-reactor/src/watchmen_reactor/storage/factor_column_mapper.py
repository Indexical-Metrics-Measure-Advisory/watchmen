from abc import abstractmethod
from typing import Dict, List

from watchmen_model.admin import Factor
from watchmen_reactor.topic_schema import TopicSchema
from watchmen_utilities import ArrayHelper, is_blank


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
