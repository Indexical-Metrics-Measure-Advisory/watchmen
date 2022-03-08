from asyncio import ensure_future, run
from datetime import date
from logging import getLogger
from typing import Optional

from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import TopicService
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_dqc.common import ask_monitor_result_pipeline_async, DqcException
from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.admin import PipelineTriggerType
from watchmen_model.dqc import MonitorRule, MonitorRuleDetected
from watchmen_model.pipeline_kernel import PipelineMonitorLog, PipelineTriggerTraceId
from watchmen_pipeline_kernel.pipeline import PipelineTrigger
from watchmen_utilities import ArrayHelper, is_not_blank
from .types import RuleResult

logger = getLogger(__name__)


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


def find_topic_schema(name: str, principal_service: PrincipalService) -> TopicSchema:
	schema = get_topic_service(principal_service).find_schema_by_name(name, principal_service.get_tenant_id())
	if schema is None:
		raise DqcException(
			f'Topic schema[name={name}, tenant={principal_service.get_tenant_id()}] not found.')
	return schema


def trigger_pipeline(detected: MonitorRuleDetected, principal_service: PrincipalService) -> None:
	schema = find_topic_schema('dqc_raw_rule_result', principal_service)
	trace_id: PipelineTriggerTraceId = str(ask_snowflake_generator().next_id())
	asynchronized = ask_monitor_result_pipeline_async()

	# noinspection PyUnusedLocal
	def handle_monitor_log(monitor_log: PipelineMonitorLog, is_asynchronized: bool) -> None:
		logger.info(monitor_log)

	pipeline_trigger = PipelineTrigger(
		trigger_topic_schema=schema,
		trigger_type=PipelineTriggerType.INSERT,
		trigger_data=detected.to_dict(),
		trace_id=trace_id,
		principal_service=principal_service,
		asynchronized=asynchronized,
		handle_monitor_log=handle_monitor_log
	)
	if asynchronized:
		ensure_future(pipeline_trigger.invoke())
	else:
		run(pipeline_trigger.invoke())


def trigger(
		rule: MonitorRule, result: RuleResult,
		start_date_of_range: date, principal_service: PrincipalService) -> None:
	topic_id = rule.topicId
	topic = get_topic_service(principal_service).find_by_id(topic_id)
	factor_id = rule.factorId
	factor_name: Optional[str] = None
	if is_not_blank(factor_id):
		factor = ArrayHelper(topic.factors).find(lambda x: x.factorId == factor_id)
		if factor is not None:
			factor_name = factor.name
	detected = MonitorRuleDetected(
		ruleCode=rule.code,
		topicId=topic_id,
		topicName=topic.name,
		factorId=factor_id,
		factorName=factor_name,
		detected=result == RuleResult.FAILED,
		severity=rule.severity,
		processDate=start_date_of_range
	)
	trigger_pipeline(detected, principal_service)
