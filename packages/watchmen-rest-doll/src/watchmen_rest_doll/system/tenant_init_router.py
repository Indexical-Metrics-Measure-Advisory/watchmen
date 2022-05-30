from typing import Callable, List, Optional

from fastapi import APIRouter, Depends
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import TenantService
from watchmen_meta.admin import PipelineService, TopicService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.system import TenantService as MetaTenantService
from watchmen_model.admin import Pipeline, Topic, UserRole
from watchmen_model.common import TenantId
from watchmen_model.dqc import ask_dqc_pipelines, ask_dqc_topics
from watchmen_model.pipeline_kernel import ask_pipeline_monitor_pipelines, ask_pipeline_monitor_topics
from watchmen_model.system import Tenant
from watchmen_rest import get_any_admin_principal
from watchmen_rest.util import raise_400, raise_404
from watchmen_rest_doll.admin import ask_save_pipeline_action, ask_save_topic_action
from watchmen_rest_doll.util import trans
from watchmen_utilities import ArrayHelper, is_blank

router = APIRouter()


def get_tenant_service(principal_service: PrincipalService) -> TenantService:
	return TenantService(principal_service)


def get_meta_tenant_service(principal_service: PrincipalService) -> MetaTenantService:
	return MetaTenantService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_topic_service(tenant_service: MetaTenantService) -> TopicService:
	return TopicService(tenant_service.storage, tenant_service.snowflakeGenerator, tenant_service.principalService)


def get_pipeline_service(tenant_service: MetaTenantService) -> PipelineService:
	return PipelineService(tenant_service.storage, tenant_service.snowflakeGenerator, tenant_service.principalService)


def create_topics_and_pipelines(
		topics: List[Topic], create_pipelines: Callable[[List[Topic]], List[Pipeline]],
		tenant_id: TenantId,
		tenant_service: MetaTenantService, principal_service: PrincipalService
) -> None:
	topic_service = get_topic_service(tenant_service)
	topic_save = ask_save_topic_action(topic_service, principal_service)
	# noinspection PyTypeChecker
	for topic in topics:
		topic.tenantId = tenant_id
		existing_topic: Optional[Topic] = topic_service.find_by_name_and_tenant(topic.name, topic.tenantId)
		if existing_topic is None:
			# create when not found, or do nothing since not sure that it needs to be updated or not
			# tail of save is ignored, since there is no data source assigned
			topic_save(topic)
	pipeline_service = get_pipeline_service(tenant_service)
	pipeline_create = ask_save_pipeline_action(pipeline_service, principal_service)
	pipelines = create_pipelines(topics)
	for pipeline in pipelines:
		pipeline.tenantId = tenant_id
		existing_pipelines = pipeline_service.find_by_topic_id(pipeline.topicId, pipeline.tenantId)
		existing = ArrayHelper(existing_pipelines).some(lambda x: pipeline.name == x.name)
		if not existing:
			# create when not found, or do nothing since not sure that it needs to be updated or not
			pipeline_create(pipeline)


@router.get('/tenant/init', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_class=Response)
async def init_tenant(
		tenant_id: Optional[TenantId],
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> None:
	if is_blank(tenant_id):
		if principal_service.is_super_admin():
			raise_400('Tenant id is required.')
		elif principal_service.is_tenant_admin():
			tenant_id = principal_service.get_tenant_id()
	else:
		if principal_service.get_tenant_id() != tenant_id and principal_service.is_tenant_admin():
			raise_400(f'Tenant[{tenant_id}] does not match principal.')
		elif principal_service.is_super_admin():
			tenant: Optional[Tenant] = get_tenant_service(principal_service).find_by_id(tenant_id)
			if tenant is None:
				raise_404(f'Tenant[id={tenant_id}] not found.')

	meta_tenant_service = get_meta_tenant_service(principal_service)

	def action() -> None:
		topics = ask_pipeline_monitor_topics()
		create_topics_and_pipelines(
			topics, lambda source_topics: ask_pipeline_monitor_pipelines(source_topics),
			tenant_id, meta_tenant_service, principal_service)
		topics = ask_dqc_topics()
		create_topics_and_pipelines(
			topics, lambda source_topics: ask_dqc_pipelines(source_topics),
			tenant_id, meta_tenant_service, principal_service)

	trans(meta_tenant_service, action)
