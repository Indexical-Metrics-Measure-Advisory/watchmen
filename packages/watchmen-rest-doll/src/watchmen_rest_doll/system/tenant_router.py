from typing import Callable, List, Optional

from fastapi import APIRouter, Body, Depends

from watchmen_auth import PrincipalService
from watchmen_data_kernel.cache import CacheService
from watchmen_meta.admin import PipelineService, TopicService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.system import TenantService
from watchmen_model.admin import Pipeline, Topic, UserRole
from watchmen_model.common import DataPage, Pageable, TenantId
from watchmen_model.dqc import ask_dqc_pipelines, ask_dqc_topics
from watchmen_model.pipeline_kernel import ask_pipeline_monitor_pipelines, ask_pipeline_monitor_topics
from watchmen_model.system import Tenant
from watchmen_rest import get_any_principal, get_super_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404
from watchmen_rest_doll.admin import ask_save_pipeline_action, ask_save_topic_action
from watchmen_rest_doll.doll import ask_create_dqc_topics_on_tenant_create, \
	ask_create_pipeline_monitor_topics_on_tenant_create, ask_tuple_delete_enabled
from watchmen_rest_doll.util import trans, trans_readonly
from watchmen_utilities import is_blank

router = APIRouter()


def get_tenant_service(principal_service: PrincipalService) -> TenantService:
	return TenantService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_topic_service(tenant_service: TenantService) -> TopicService:
	return TopicService(tenant_service.storage, tenant_service.snowflakeGenerator, tenant_service.principalService)


def get_pipeline_service(tenant_service: TenantService) -> PipelineService:
	return PipelineService(tenant_service.storage, tenant_service.snowflakeGenerator, tenant_service.principalService)


@router.get('/tenant', tags=[UserRole.CONSOLE, UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=Tenant)
async def load_tenant_by_id(
		tenant_id: Optional[TenantId] = None,
		principal_service: PrincipalService = Depends(get_any_principal)
) -> Tenant:
	if is_blank(tenant_id):
		raise_400('Tenant id is required.')
	if not principal_service.is_super_admin():
		if tenant_id != principal_service.get_tenant_id():
			raise_403()

	tenant_service = get_tenant_service(principal_service)

	def action() -> Tenant:
		# noinspection PyTypeChecker
		tenant: Tenant = tenant_service.find_by_id(tenant_id)
		if tenant is None:
			raise_404()
		return tenant

	return trans_readonly(tenant_service, action)


def create_topics_and_pipelines(
		topics: List[Topic], create_pipelines: Callable[[List[Topic]], List[Pipeline]],
		tenant_id: TenantId,
		tenant_service: TenantService, principal_service: PrincipalService
) -> None:
	topic_service = get_topic_service(tenant_service)
	topic_create = ask_save_topic_action(topic_service, principal_service)
	# noinspection PyTypeChecker
	for topic in topics:
		topic.tenantId = tenant_id
		# tail is ignored, since there is no data source assigned
		topic_create(topic)
	pipeline_service = get_pipeline_service(tenant_service)
	pipeline_create = ask_save_pipeline_action(pipeline_service, principal_service)
	pipelines = create_pipelines(topics)
	for pipeline in pipelines:
		pipeline.tenantId = tenant_id
		pipeline_create(pipeline)


@router.post('/tenant', tags=[UserRole.SUPER_ADMIN], response_model=Tenant)
async def save_tenant(
		tenant: Tenant, principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> Tenant:
	tenant_service = get_tenant_service(principal_service)

	def action(a_tenant: Tenant) -> Tenant:
		if tenant_service.is_storable_id_faked(a_tenant.tenantId):
			tenant_service.redress_storable_id(a_tenant)
			# noinspection PyTypeChecker
			a_tenant: Tenant = tenant_service.create(a_tenant)
			if ask_create_pipeline_monitor_topics_on_tenant_create():
				topics = ask_pipeline_monitor_topics()
				create_topics_and_pipelines(
					topics, lambda source_topics: ask_pipeline_monitor_pipelines(source_topics),
					a_tenant.tenantId, tenant_service, principal_service
				)
			if ask_create_dqc_topics_on_tenant_create():
				topics = ask_dqc_topics()
				create_topics_and_pipelines(
					topics, lambda source_topics: ask_dqc_pipelines(source_topics),
					a_tenant.tenantId, tenant_service, principal_service
				)
		else:
			# noinspection PyTypeChecker
			a_tenant: Tenant = tenant_service.update(a_tenant)
		CacheService.tenant().put(a_tenant)
		return a_tenant

	return trans(tenant_service, lambda: action(tenant))


class QueryTenantDataPage(DataPage):
	data: List[Tenant]


@router.post('/tenant/name', tags=[UserRole.SUPER_ADMIN], response_model=QueryTenantDataPage)
async def find_tenants_by_name(
		query_name: Optional[str] = None, pageable: Pageable = Body(...),
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> QueryTenantDataPage:
	tenant_service = get_tenant_service(principal_service)

	def action() -> QueryTenantDataPage:
		if is_blank(query_name):
			# noinspection PyTypeChecker
			return tenant_service.find_by_text(None, pageable)
		else:
			# noinspection PyTypeChecker
			return tenant_service.find_by_text(query_name, pageable)

	return trans_readonly(tenant_service, action)


@router.delete('/tenant', tags=[UserRole.SUPER_ADMIN], response_model=Tenant)
async def delete_tenant_by_id_by_super_admin(
		tenant_id: Optional[TenantId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> Tenant:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(tenant_id):
		raise_400('Tenant id is required.')

	tenant_service = get_tenant_service(principal_service)

	def action() -> Tenant:
		# noinspection PyTypeChecker
		tenant: Tenant = tenant_service.delete(tenant_id)
		if tenant is None:
			raise_404()
		CacheService.tenant().remove(tenant_id)
		return tenant

	return trans(tenant_service, action)
