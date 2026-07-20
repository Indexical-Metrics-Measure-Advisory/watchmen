from typing import Any, Dict

from .async_data_service import AsyncTopicDataService


class AsyncRegularTopicDataService(AsyncTopicDataService):
	"""
	Asynchronous counterpart of RegularTopicDataService. Only overrides the pure
	data-shaping wrap/unwrap methods (which involve no storage); all async
	storage operations are inherited from AsyncTopicDataService.
	"""

	def try_to_wrap_to_topic_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
		self.delete_reversed_columns(data)
		return data

	def try_to_unwrap_from_topic_data(self, topic_data: Dict[str, Any]) -> Dict[str, Any]:
		return topic_data
