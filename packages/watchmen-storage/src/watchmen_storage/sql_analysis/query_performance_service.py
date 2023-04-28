

def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


def find_topic_schema(name: str, principal_service: PrincipalService) -> TopicSchema:
	schema = get_topic_service(principal_service).find_schema_by_name(name, principal_service.get_tenant_id())
	if schema is None:
		raise PipelineKernelException(
			f'Topic schema[name={name}, tenant={principal_service.get_tenant_id()}] not found.')
	return schema

def push_to_topic():
	schema = find_topic_schema('raw_pipeline_monitor_log', principal_service)
	trigger = PipelineTrigger(
		trigger_topic_schema=schema,
		trigger_type=PipelineTriggerType.INSERT,
		trigger_data=monitor_log.dict(),
		trace_id=trace_id,
		principal_service=principal_service,
		asynchronized=asynchronized,
		handle_monitor_log=handle_monitor_log
	)
	if asynchronized:
		ensure_future(trigger.invoke())