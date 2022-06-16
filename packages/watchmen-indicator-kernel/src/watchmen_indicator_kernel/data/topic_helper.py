from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import TopicService
from watchmen_indicator_kernel.common import IndicatorKernelException
from watchmen_model.admin import Topic
from watchmen_model.common import TopicId


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


def ask_topic(topic_id: TopicId, principal_service: PrincipalService) -> Topic:
	topic = get_topic_service(principal_service).find_by_id(topic_id)
	if topic is None:
		raise IndicatorKernelException(f'Topic[id={topic_id}] not found.')
	if topic.tenantId != principal_service.get_tenant_id():
		raise IndicatorKernelException(f'Topic[id={topic_id}] not found.')

	return topic
