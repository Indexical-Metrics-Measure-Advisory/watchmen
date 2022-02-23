from watchmen_model.admin import is_raw_topic
from watchmen_reactor.cache import CacheService
from watchmen_reactor.storage import RawTopicDataEntityHelper, RegularTopicDataEntityHelper, TopicDataEntityHelper
from watchmen_reactor.topic_schema import TopicSchema


def ask_topic_data_entity_helper(schema: TopicSchema) -> TopicDataEntityHelper:
	"""
	ask topic data entity helper, from cache first
	"""
	data_entity_helper = CacheService.topic().get_entity_helper(schema.get_topic().topicId)
	if data_entity_helper is None:
		if is_raw_topic(schema.get_topic()):
			data_entity_helper = RawTopicDataEntityHelper(schema)
		else:
			data_entity_helper = RegularTopicDataEntityHelper(schema)
		CacheService.topic().put_entity_helper(data_entity_helper)
	return data_entity_helper
