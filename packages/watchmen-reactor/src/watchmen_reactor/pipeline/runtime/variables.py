from __future__ import annotations

from copy import deepcopy
from typing import Any, Dict, Optional


class PipelineVariables:
	variables: Dict[str, Any] = {}

	def __init__(self, previous_data: Optional[Dict[str, Any]], current_data: Optional[Dict[str, Any]]):
		self.previousData = previous_data
		self.currentData = current_data

	def put(self, name: str, value: Any):
		self.variables[name] = value

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
		cloned = PipelineVariables(self.previousData, self.currentData)
		cloned.variables = deepcopy(self.variables)
		return cloned

	def clone_all(self) -> PipelineVariables:
		cloned = PipelineVariables(deepcopy(self.previousData), deepcopy(self.currentData))
		cloned.variables = deepcopy(self.variables)
		return cloned

	def backward_to_previous(self):
		"""
		not cloned, assume it will not be changed
		"""
		backed = PipelineVariables(None, self.previousData)
		backed.variables = self.variables
		return backed
