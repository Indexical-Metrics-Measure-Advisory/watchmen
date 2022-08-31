from typing import Optional

from watchmen_auth import PrincipalService
from watchmen_data_kernel.common import ask_datetime_formats
from watchmen_data_kernel.meta import TopicService
from watchmen_data_kernel.service import ask_topic_data_service
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_model.common import DataPage, Pageable, TenantId, TopicId
from watchmen_model.pipeline_kernel import PipelineMonitorLog, PipelineMonitorLogCriteria, TopicDataColumnNames
from watchmen_pipeline_kernel.common import PipelineKernelException
from watchmen_pipeline_kernel.topic import RuntimeTopicStorages
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaOperator, EntitySortColumn, \
	EntitySortMethod
from watchmen_utilities import ArrayHelper, is_date, is_not_blank


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


def find_topic_schema(name: str, principal_service: PrincipalService) -> TopicSchema:
	schema = get_topic_service(principal_service).find_schema_by_name(name, principal_service.get_tenant_id())
	if schema is None:
		raise PipelineKernelException(
			f'Topic schema[name={name}, tenant={principal_service.get_tenant_id()}] not found.')
	return schema


class PipelineMonitorLogDataService:
	def __init__(self, principal_service: PrincipalService):
		self.principalService = principal_service

	def get_topic_schema(self):
		return find_topic_schema('raw_pipeline_monitor_log', self.principalService)

	def ask_storages(self):
		return RuntimeTopicStorages(self.principalService)

	def find_last(self, data_id: int, topic_id: TopicId, tenant_id: TenantId) -> Optional[PipelineMonitorLog]:
		schema = self.get_topic_schema()
		storage = self.ask_storages().ask_topic_storage(schema)
		data_service = ask_topic_data_service(schema, storage, self.principalService)
		# noinspection SpellCheckingInspection
		page = data_service.page(data_service.get_data_entity_helper().get_entity_pager(
			criteria=[
				EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName=TopicDataColumnNames.TENANT_ID.value), right=tenant_id),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='topicid'), right=topic_id),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='dataid'), right=data_id)
			],
			sort=[EntitySortColumn(
				name=TopicDataColumnNames.INSERT_TIME.value,
				method=EntitySortMethod.DESC,
			)],
			pageable=Pageable(pageNumber=1, pageSize=1)
		))
		if page.itemCount == 0:
			return None
		else:
			return PipelineMonitorLog(**page.data[0])

	def page(self, criteria: PipelineMonitorLogCriteria) -> DataPage:
		schema = self.get_topic_schema()
		storage = self.ask_storages().ask_topic_storage(schema)
		data_service = ask_topic_data_service(schema, storage, self.principalService)

		entity_criteria = [
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName=TopicDataColumnNames.TENANT_ID.value), right=criteria.tenantId)
		]
		if is_not_blank(criteria.traceId):
			# noinspection SpellCheckingInspection
			entity_criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='traceid'), right=criteria.traceId))
		if is_not_blank(criteria.topicId):
			# noinspection SpellCheckingInspection
			entity_criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='topicid'), right=criteria.topicId))
		if is_not_blank(criteria.pipelineId):
			# noinspection SpellCheckingInspection
			entity_criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='pipelineid'), right=criteria.pipelineId))
		if is_not_blank(criteria.status):
			entity_criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='status'), right=criteria.status))
		start_date_parsed, start_date = is_date(criteria.startDate, ask_datetime_formats())
		end_date_parsed, end_date = is_date(criteria.endDate, ask_datetime_formats())
		if start_date_parsed:
			entity_criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName=TopicDataColumnNames.INSERT_TIME.value),
				operator=EntityCriteriaOperator.GREATER_THAN_OR_EQUALS,
				right=start_date
			))
		if end_date_parsed:
			entity_criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName=TopicDataColumnNames.INSERT_TIME.value),
				operator=EntityCriteriaOperator.LESS_THAN_OR_EQUALS,
				right=end_date
			))

		page = data_service.page(data_service.get_data_entity_helper().get_entity_pager(
			criteria=entity_criteria,
			sort=[EntitySortColumn(name='starttime', method=EntitySortMethod.DESC)],
			pageable=Pageable(pageNumber=criteria.pageNumber, pageSize=criteria.pageSize)
		))

		page.data = ArrayHelper(page.data).map(lambda x: x.get(TopicDataColumnNames.RAW_TOPIC_DATA.value)) \
			.filter(lambda x: x is not None) \
			.map(lambda x: PipelineMonitorLog(**x)) \
			.to_list()
		return page
