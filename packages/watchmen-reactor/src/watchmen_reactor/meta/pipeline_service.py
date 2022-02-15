from typing import List, Optional

from watchmen_auth import PrincipalService
from watchmen_meta.admin import PipelineService as PipelineStorageService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import Pipeline
from watchmen_model.common import PipelineId, TopicId
from watchmen_reactor.cache import CacheService
from watchmen_utilities import ArrayHelper


class PipelineService:
	def __init__(self, principal_service: PrincipalService):
		self.principal_service = principal_service

	def find_by_id(self, pipeline_id: PipelineId) -> Optional[Pipeline]:
		pipeline = CacheService.pipeline().get(pipeline_id)
		if pipeline is not None:
			return pipeline

		storage_service = PipelineStorageService(ask_meta_storage(), ask_snowflake_generator(), self.principal_service)
		storage_service.begin_transaction()
		try:
			# noinspection PyTypeChecker
			pipeline: Pipeline = storage_service.find_by_id(pipeline_id)
			if pipeline is None:
				return None

			CacheService.pipeline().put(pipeline)
			return pipeline
		finally:
			storage_service.close_transaction()

	def find_by_topic_id(self, topic_id: TopicId) -> List[Pipeline]:
		pipeline_ids = CacheService.pipelines_by_topic().get(topic_id)
		if pipeline_ids is not None:
			pipelines = ArrayHelper(pipeline_ids) \
				.map(lambda x: self.find_by_id(x)) \
				.filter(lambda x: x is not None).to_list()
			if len(pipelines) != len(pipeline_ids):
				loaded = ArrayHelper(pipelines).map(lambda x: x.pipelineId).to_list()
				raise Exception(f'Except pipelines[{pipeline_ids}], but get[{loaded}] only.')
			return pipelines

		storage_service = PipelineStorageService(ask_meta_storage(), ask_snowflake_generator(), self.principal_service)
		storage_service.begin_transaction()
		try:
			# noinspection PyTypeChecker
			pipelines: List[Pipeline] = storage_service.find_by_topic_id(
				topic_id, self.principal_service.get_tenant_id())
			if len(pipelines) == 0:
				CacheService.pipelines_by_topic().declare_no_pipelines(topic_id)
				return pipelines

			return ArrayHelper(pipelines).each(lambda x: CacheService.pipeline().put(x)).to_list()
		finally:
			storage_service.close_transaction()
