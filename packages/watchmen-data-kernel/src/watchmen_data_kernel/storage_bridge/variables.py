from __future__ import annotations

from copy import deepcopy
from typing import Any, Dict, List, Optional, Tuple

from watchmen_model.admin import Factor, FactorType, Topic
from watchmen_utilities import ArrayHelper, is_blank


class PipelineVariables:
	def __init__(
			self, previous_data: Optional[Dict[str, Any]], current_data: Optional[Dict[str, Any]],
			topic: Optional[Topic]
	):
		self.previousData = previous_data
		self.currentData = current_data
		self.variables: Dict[str, Any] = {}
		# only variables from trigger data will record its factor name here
		# key is variable key, value is factor name
		self.variables_from: Dict[str, str] = {}
		self.topic = topic

	def is_list_on_trigger(self, names: List[str]) -> bool:
		if self.topic is None:
			# no topic declared, false
			return False

		name = ArrayHelper(names).join('.')
		factor: Optional[Factor] = ArrayHelper(self.topic.factors).find(lambda x: x.name == name)
		if factor is None:
			return False
		else:
			return factor.type == FactorType.ARRAY

	def is_list_on_variables(self, names: List[str]) -> bool:
		factor_name = self.variables_from.get(names[0])
		if is_blank(factor_name):
			return False
		else:
			factor_name = factor_name + '.' + ArrayHelper(names[1:]).join('.')
			factor: Optional[Factor] = ArrayHelper(self.topic.factors).find(lambda x: x.name == factor_name)
			if factor is None:
				return False
			else:
				return factor.type == FactorType.ARRAY

	def trace_variable(self, name: str) -> Tuple[bool, Optional[str]]:
		if name in self.variables_from:
			return True, self.variables_from.get(name)
		else:
			return False, None

	def put_with_from(self, name: str, value: Any, from_: str):
		self.put(name, value)
		self.variables_from[name] = from_

	def put(self, name: str, value: Any):
		self.variables[name] = value
		if name in self.variables_from:
			del self.variables_from[name]

	def has(self, name: str) -> bool:
		return name in self.variables

	def find(self, name: str) -> Optional[Any]:
		return self.variables.get(name)

	def find_from_current_data(self, name: str) -> Optional[Any]:
		return self.currentData.get(name)

	def has_previous_trigger_data(self) -> bool:
		return self.previousData is not None

	def get_previous_trigger_data(self) -> Optional[Dict[str, Any]]:
		return self.previousData

	def clone(self) -> PipelineVariables:
		cloned = PipelineVariables(self.previousData, self.currentData, self.topic)
		cloned.variables_from = deepcopy(self.variables_from)
		cloned.variables = deepcopy(self.variables)
		return cloned

	def clone_all(self) -> PipelineVariables:
		cloned = PipelineVariables(deepcopy(self.previousData), deepcopy(self.currentData), self.topic)
		cloned.variables_from = deepcopy(self.variables_from)
		cloned.variables = deepcopy(self.variables)
		return cloned

	def backward_to_previous(self):
		"""
		not cloned, assume it will not be changed
		"""
		backed = PipelineVariables(None, self.previousData, self.topic)
		backed.variables_from = deepcopy(self.variables_from)
		backed.variables = self.variables
		return backed
