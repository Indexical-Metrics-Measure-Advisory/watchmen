from datetime import datetime
from typing import List

from watchmen_auth import PrincipalService
from watchmen_data_kernel.common import DataKernelException
from watchmen_data_kernel.meta import TopicService,PipelineService
from watchmen_data_kernel.service import ask_topic_storage, ask_topic_data_service
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_model.dqc.monitor_result import PipelineMonitorResult
from watchmen_model.pipeline_kernel import TopicDataColumnNames
from watchmen_storage import EntityCriteriaExpression, ColumnNameLiteral, EntityCriteriaOperator


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)

def get_pipeline_service(principal_service: PrincipalService):
	return PipelineService(principal_service)

class PipelineMonitorHealthService:


	def __init__(self,principal_service: PrincipalService):
		self.principalService = principal_service
		self.monitor_topic:TopicSchema = self.find_monitor_topics("raw_pipeline_monitor_log")
		self.error_topic:TopicSchema =  self.find_monitor_topics("pipeline_monitor_error_log")


	def find_monitor_topics(self,topic_name):
		topic = get_topic_service(self.principalService).find_schema_by_name(topic_name,self.principalService.tenantId)
		if topic is None:
			raise DataKernelException(f'Topic[name={topic_name}] not found.')
		return topic


	async def build_result(self,error_count:int,error_data:List)->PipelineMonitorResult:
		result = PipelineMonitorResult()
		result.errorCount = error_count
		result.errorDetails = error_data
		return result



	async def run_health_check(self,start_time:datetime,end_time:datetime)->PipelineMonitorResult:

		## check error topic
		storage = ask_topic_storage(self.error_topic, self.principalService)
		service = ask_topic_data_service(self.error_topic, storage, self.principalService)

		criteria = [
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName=TopicDataColumnNames.TENANT_ID.value),
				right=self.principalService.get_tenant_id()),
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName=TopicDataColumnNames.UPDATE_TIME.value),
				operator=EntityCriteriaOperator.GREATER_THAN_OR_EQUALS,
				right=start_time),
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName=TopicDataColumnNames.UPDATE_TIME.value),
				operator=EntityCriteriaOperator.LESS_THAN_OR_EQUALS,
				right=end_time)
		]

		error_count = service.count_by_criteria(criteria)
		if error_count > 0:
			error_data= service.find(criteria)
		else:
			error_data = []

		error_result = await self.build_result(error_count,error_data)
		return error_result


	async def get_topic_name(self,topic_id:str):
		topic = get_topic_service(self.principalService).find_by_id(topic_id)
		return topic.name

	async def get_pipeline_name(self,pipeline_id:str):
		pipeline = get_pipeline_service(self.principalService).find_by_id(pipeline_id)
		return pipeline.name









