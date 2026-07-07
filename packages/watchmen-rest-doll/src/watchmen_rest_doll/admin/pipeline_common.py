import yaml
from datetime import datetime
from typing import Callable, List, Optional

from fastapi import APIRouter
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_data_kernel.cache import CacheService
from watchmen_data_kernel.common import ask_all_date_formats, ask_replace_topic_to_storage, ask_sync_topic_to_storage
from watchmen_meta.admin import PipelineService, TopicService
from watchmen_meta.analysis import PipelineIndexService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator, TupleService
from watchmen_model.admin import Pipeline, PipelineAction, PipelineStage, PipelineUnit, Topic, TopicKind, UserRole
from watchmen_model.common import PipelineId, TenantId, TopicId
from watchmen_rest import get_admin_principal, get_console_principal, get_super_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404, validate_tenant_id
from watchmen_rest_doll.doll import ask_tuple_delete_enabled
from watchmen_rest_doll.util import trans, trans_readonly
from watchmen_utilities import ArrayHelper, is_blank, is_date, ExtendedBaseModel


def ensure_design_environment_for_yaml_update() -> None:
	if not ask_replace_topic_to_storage() and not ask_sync_topic_to_storage():
		raise_400('Current environment is runtime. YAML update is allowed only in design environment.')


def get_pipeline_service(principal_service: PrincipalService) -> PipelineService:
	return PipelineService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_pipeline_index_service(pipeline_service: PipelineService) -> PipelineIndexService:
	return PipelineIndexService(pipeline_service.storage, pipeline_service.snowflakeGenerator)


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def is_system_topic_by_id(topic_id: TopicId, principal_service: PrincipalService) -> bool:
	topic_service = get_topic_service(principal_service)
	topic = trans_readonly(topic_service, lambda: topic_service.find_by_id(topic_id))
	if topic is None:
		return False
	return topic.kind == TopicKind.SYSTEM


def filter_pipelines_by_source_topic_system(
		pipelines: List[Pipeline], principal_service: PrincipalService
) -> List[Pipeline]:
	return ArrayHelper(pipelines).filter(
		lambda x: not is_system_topic_by_id(x.topicId, principal_service)
	).to_list()


def redress_action_ids(action: PipelineAction, pipeline_service: PipelineService) -> None:
	if TupleService.is_storable_id_faked(action.actionId):
		action.actionId = pipeline_service.generate_storable_id()


def redress_unit_ids(unit: PipelineUnit, pipeline_service: PipelineService) -> None:
	if TupleService.is_storable_id_faked(unit.unitId):
		unit.unitId = pipeline_service.generate_storable_id()
	ArrayHelper(unit.do).each(lambda x: redress_action_ids(x, pipeline_service))


def redress_stage_ids(stage: PipelineStage, pipeline_service: PipelineService) -> None:
	if TupleService.is_storable_id_faked(stage.stageId):
		stage.stageId = pipeline_service.generate_storable_id()
	ArrayHelper(stage.units).each(lambda x: redress_unit_ids(x, pipeline_service))


def redress_ids(pipeline: Pipeline, pipeline_service: PipelineService) -> None:
	ArrayHelper(pipeline.stages).each(lambda x: redress_stage_ids(x, pipeline_service))


def build_pipeline_index(pipeline: Pipeline, pipeline_service: PipelineService) -> None:
	get_pipeline_index_service(pipeline_service).build_index(pipeline)


def build_pipeline_cache(pipeline: Pipeline) -> None:
	CacheService.pipeline().put(pipeline)


def post_save_pipeline(pipeline: Pipeline, pipeline_service: PipelineService) -> None:
	build_pipeline_index(pipeline, pipeline_service)
	build_pipeline_cache(pipeline)


# noinspection PyUnusedLocal
def ask_save_pipeline_action(
		pipeline_service: PipelineService, principal_service: PrincipalService) -> Callable[[Pipeline], Pipeline]:
	def action(pipeline: Pipeline) -> Pipeline:
		if pipeline_service.is_storable_id_faked(pipeline.pipelineId):
			pipeline_service.redress_storable_id(pipeline)
			redress_ids(pipeline, pipeline_service)
			# noinspection PyTypeChecker
			pipeline: Pipeline = pipeline_service.create(pipeline)
		else:
			# noinspection PyTypeChecker
			existing_pipeline: Optional[Pipeline] = pipeline_service.find_by_id(pipeline.pipelineId)
			if existing_pipeline is not None:
				if existing_pipeline.tenantId != pipeline.tenantId:
					raise_403()

			redress_ids(pipeline, pipeline_service)
			# noinspection PyTypeChecker
			pipeline: Pipeline = pipeline_service.update(pipeline)

		post_save_pipeline(pipeline, pipeline_service)

		return pipeline

	return action


def post_update_pipeline_name(pipeline: Pipeline, pipeline_service: PipelineService) -> None:
	get_pipeline_index_service(pipeline_service).update_index_on_name_changed(pipeline)
	CacheService.pipeline().put(pipeline)


def post_update_pipeline_enablement(pipeline: Pipeline, pipeline_service: PipelineService) -> None:
	get_pipeline_index_service(pipeline_service).update_index_on_enablement_changed(pipeline)
	CacheService.pipeline().put(pipeline)


class LastModified(ExtendedBaseModel):
	at: Optional[str] = None


def remove_pipeline_index(pipeline_id: PipelineId, pipeline_service: PipelineService) -> None:
	get_pipeline_index_service(pipeline_service).remove_index(pipeline_id)


def post_delete_pipeline(pipeline_id: PipelineId, pipeline_service: PipelineService) -> None:
	remove_pipeline_index(pipeline_id, pipeline_service)
	CacheService.pipeline().remove(pipeline_id)
