from watchmen_auth import PrincipalService
from watchmen_data_kernel.storage.data_service import TopicDataService
from watchmen_data_kernel.storage.raw_data_service import RawTopicDataService
from watchmen_data_kernel.storage.regular_data_service import RegularTopicDataService
from watchmen_data_kernel.storage.async_data_service import AsyncTopicDataService
from watchmen_data_kernel.storage.async_raw_data_service import AsyncRawTopicDataService
from watchmen_data_kernel.storage.async_regular_data_service import AsyncRegularTopicDataService
from watchmen_data_kernel.storage_bridge.topic_utils import ask_topic_data_entity_helper
from watchmen_data_kernel.meta import DataSourceService
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_model.admin import is_raw_topic
from watchmen_storage import AsyncTopicDataStorageSPI, TopicDataStorageSPI


def ask_topic_data_service(
		schema: TopicSchema, storage: TopicDataStorageSPI, principal_service: PrincipalService) -> TopicDataService:
	"""
	ask topic data service
	"""
	data_entity_helper = ask_topic_data_entity_helper(schema)
	storage.register_topic(schema.get_topic(),
	                       DataSourceService(principal_service).find_by_id(schema.get_topic().dataSourceId))
	if is_raw_topic(schema.get_topic()):
		return RawTopicDataService(schema, data_entity_helper, storage, principal_service)
	else:
		return RegularTopicDataService(schema, data_entity_helper, storage, principal_service)


async def ask_topic_data_service_async(
		schema: TopicSchema, storage: AsyncTopicDataStorageSPI,
		principal_service: PrincipalService) -> AsyncTopicDataService:
	"""
	Asynchronous counterpart of ask_topic_data_service. Registers the topic table
	definition on the async storage (awaited) and returns an async data service
	(Raw or Regular) backed by the given async storage.
	"""
	data_entity_helper = ask_topic_data_entity_helper(schema)
	await storage.register_topic(schema.get_topic(),
	                             DataSourceService(principal_service).find_by_id(schema.get_topic().dataSourceId))
	if is_raw_topic(schema.get_topic()):
		return AsyncRawTopicDataService(schema, data_entity_helper, storage, principal_service)
	else:
		return AsyncRegularTopicDataService(schema, data_entity_helper, storage, principal_service)

