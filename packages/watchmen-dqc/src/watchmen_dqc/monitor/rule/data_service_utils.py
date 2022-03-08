from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import TopicService
from watchmen_data_kernel.service import ask_topic_data_service, ask_topic_storage
from watchmen_data_kernel.storage import TopicDataService
from watchmen_dqc.common import DqcException
from watchmen_model.common import TopicId


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


def exchange_topic_data_service(data_service: TopicDataService, topic_id: TopicId) -> TopicDataService:
	principal_service = data_service.get_principal_service()
	topic_service = get_topic_service(principal_service)
	topic = topic_service.find_by_id(topic_id)
	if topic is None:
		raise DqcException(f'Topic[id={topic_id}] not found.')
	schema = topic_service.find_schema_by_name(topic.name, principal_service.get_tenant_id())
	if schema is None:
		raise DqcException(f'Topic[name={topic.name}] not found.')
	storage = ask_topic_storage(schema, principal_service)
	return ask_topic_data_service(schema, storage, data_service.get_principal_service())
