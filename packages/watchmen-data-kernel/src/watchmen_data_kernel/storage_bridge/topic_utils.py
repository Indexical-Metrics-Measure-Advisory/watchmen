from watchmen_data_kernel.cache import CacheService
from watchmen_data_kernel.storage import RawTopicDataEntityHelper, RegularTopicDataEntityHelper, TopicDataEntityHelper
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_model.admin import is_raw_topic


def ask_topic_data_entity_helper(schema: TopicSchema) -> TopicDataEntityHelper:
	"""
	ask topic data entity helper, from cache first.
	never use cache for fake topic
	"""
	if schema.get_topic().topicId == '-1':
		data_entity_helper = None
	else:
		data_entity_helper = CacheService.topic().get_entity_helper(schema.get_topic().topicId)
	if data_entity_helper is None:
		if is_raw_topic(schema.get_topic()):
			data_entity_helper = RawTopicDataEntityHelper(schema)
		else:
			data_entity_helper = RegularTopicDataEntityHelper(schema)

		if schema.get_topic().topicId != '-1':
			CacheService.topic().put_entity_helper(data_entity_helper)
	return data_entity_helper
