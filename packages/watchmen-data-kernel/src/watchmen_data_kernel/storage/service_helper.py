from watchmen_auth import PrincipalService
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_model.admin import is_raw_topic
from watchmen_storage import TopicDataStorageSPI
from .data_service import TopicDataService
from .raw_data_service import RawTopicDataService
from .regular_data_service import RegularTopicDataService
from .topic_utils import ask_topic_data_entity_helper


def ask_topic_data_service(
		schema: TopicSchema, storage: TopicDataStorageSPI, principal_service: PrincipalService) -> TopicDataService:
	"""
	ask topic data service
	"""
	data_entity_helper = ask_topic_data_entity_helper(schema)
	storage.register_topic(schema.get_topic())
	if is_raw_topic(schema.get_topic()):
		return RawTopicDataService(schema, data_entity_helper, storage, principal_service)
	else:
		return RegularTopicDataService(schema, data_entity_helper, storage, principal_service)
