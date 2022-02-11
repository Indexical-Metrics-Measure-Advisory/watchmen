from typing import Dict

from watchmen_auth import PrincipalService
from watchmen_model.admin import PipelineTriggerType
from watchmen_model.reactor import PipelineTriggerData, PipelineTriggerTraceId
from watchmen_reactor.meta import TopicService
from watchmen_reactor.topic_schema import TopicSchema


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


def find_topic(name: str, principal_service: PrincipalService) -> TopicSchema:
	schema = get_topic_service(principal_service).find_schema_by_name(name, principal_service.get_tenant_id())
	if schema is None:
		raise Exception(f'Schema of topic[name={name}, tenant={principal_service.get_tenant_id()}] not found.')
	return schema


def save_topic_data(schema: TopicSchema, data: Dict[str, any], trigger_type: PipelineTriggerType) -> Dict[str, any]:
	data = schema.prepare_data(data)
	# TODO save
	return data


async def try_to_invoke_pipelines(
		trigger_data: PipelineTriggerData, trace_id: PipelineTriggerTraceId,
		principal_service: PrincipalService
) -> None:
	schema = find_topic(trigger_data.code, principal_service)
	save_topic_data(schema, trigger_data.data, trigger_data.triggerType)
	pass


async def try_to_invoke_pipelines_async(
		trigger_data: PipelineTriggerData, trace_id: PipelineTriggerTraceId,
		principal_service: PrincipalService
) -> None:
	schema = find_topic(trigger_data.code, principal_service)
	save_topic_data(schema, trigger_data.data, trigger_data.triggerType)
	pass
