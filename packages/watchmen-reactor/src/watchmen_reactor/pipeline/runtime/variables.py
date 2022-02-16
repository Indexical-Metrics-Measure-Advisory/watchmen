from typing import Any, Dict, Optional


class PipelineVariables:
	variables: Dict[str, Any] = {}

	def __init__(self, previous_data: Optional[Dict[str, Any]], current_data: Optional[Dict[str, Any]]):
		self.previous_data = previous_data
		self.current_data = current_data

	def put(self, name: str, value: Any):
		self.variables[name] = value

	def find(self, name: str) -> Optional[Any]:
		# TODO  find variables
		return self.variables.get(name)
