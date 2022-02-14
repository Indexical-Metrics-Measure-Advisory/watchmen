from typing import Any, Dict

from .data_service import TopicDataService


class RawTopicDataService(TopicDataService):
	def create(self, data: Dict[str, Any]):
		pass

	def find(self, data: Dict[str, Any]):
		pass

	def update(self, data: Dict[str, Any]):
		pass

	def delete(self, data: Dict[str, Any]):
		pass
