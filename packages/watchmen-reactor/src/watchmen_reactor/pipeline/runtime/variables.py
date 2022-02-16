from typing import Any, Dict, Optional


class PipelineVariables:
	def __init__(self, previous_data: Optional[Dict[str, Any]], current_data: Optional[Dict[str, Any]]):
		self.previous_data = previous_data
		self.current_data = current_data