from abc import abstractmethod
from typing import Dict, List, Optional

from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_model.admin import Factor
from watchmen_utilities import ArrayHelper, is_blank


class TopicFactorColumnMapper:
	def __init__(self, schema: TopicSchema):
		self.factors = self.get_factors(schema)
		self.factor2Column = self.create_factor_to_column_dict(self.factors)
		self.factorNames = list(self.factor2Column.keys())
		self.column2Factor = dict((v, k) for k, v in self.factor2Column.items())
		self.columnNames = list(self.column2Factor.keys())

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
			a_dict[factor_name] = factor_name.replace('.', '_').lower()
			return a_dict

		return ArrayHelper(factors).reduce(put_into_map, {})

	def get_column_name(self, factor_name: str) -> Optional[str]:
		return self.factor2Column.get(factor_name)

	def get_column_names(self) -> List[str]:
		return self.columnNames

	def get_factor_name(self, column_name: str) -> Optional[str]:
		return self.column2Factor.get(column_name)

	def get_factor_names(self) -> List[str]:
		return self.factorNames
