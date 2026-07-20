from typing import Any, Dict

from watchmen_model.admin import Factor
from watchmen_model.pipeline_kernel import TopicDataColumnNames
from watchmen_utilities import ArrayHelper
from .async_data_service import AsyncTopicDataService
from .raw_data_service import RawTopicDataEntityHelper, RawTopicShaper


class AsyncRawTopicDataService(AsyncTopicDataService):
	"""
	Asynchronous counterpart of RawTopicDataService. Only overrides the pure
	data-shaping wrap/unwrap methods (which involve no storage); all async
	storage operations are inherited from AsyncTopicDataService.
	"""

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
