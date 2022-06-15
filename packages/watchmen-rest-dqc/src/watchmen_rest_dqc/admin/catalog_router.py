from typing import Callable, List, Optional

from fastapi import APIRouter, Depends
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_meta.admin import TopicService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.dqc import CatalogService
from watchmen_model.admin import UserRole
from watchmen_model.common import TenantId, TopicId
from watchmen_model.dqc import Catalog, CatalogCriteria, CatalogId
from watchmen_rest import get_admin_principal, get_any_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404, validate_tenant_id
from watchmen_rest_dqc.util import trans, trans_readonly
from watchmen_utilities import ArrayHelper, is_blank

router = APIRouter()


def get_catalog_service(principal_service: PrincipalService) -> CatalogService:
	return CatalogService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_topic_service(catalog_service: CatalogService) -> TopicService:
	return TopicService(catalog_service.storage, catalog_service.snowflakeGenerator, catalog_service.principalService)


@router.get('/dqc/catalog', tags=[UserRole.ADMIN], response_model=Catalog)
async def load_catalog_by_id(
		catalog_id: Optional[CatalogId] = None, principal_service: PrincipalService = Depends(get_admin_principal)
) -> Catalog:
	if is_blank(catalog_id):
		raise_400('Catalog id is required.')

	catalog_service = get_catalog_service(principal_service)

	def action() -> Catalog:
		# noinspection PyTypeChecker
		catalog: Catalog = catalog_service.find_by_id(catalog_id)
		if catalog is None:
			raise_404()
		# tenant id must match current principal's
		if catalog.tenantId != principal_service.get_tenant_id():
			raise_404()
		return catalog

	return trans_readonly(catalog_service, action)


# noinspection DuplicatedCode
def validate_topics(catalog_service: CatalogService, topic_ids: List[TopicId], tenant_id: TenantId) -> None:
	if topic_ids is None:
		return
	given_count = len(topic_ids)
	if given_count == 0:
		return
	topic_service = get_topic_service(catalog_service)
	existing_topic_ids = topic_service.find_ids_by_ids(topic_ids, tenant_id)
	if given_count != len(existing_topic_ids):
		raise_400('Topic ids do not match')


# noinspection PyUnusedLocal
def ask_save_catalog_action(
		catalog_service: CatalogService, principal_service: PrincipalService) -> Callable[[Catalog], Catalog]:
	def action(catalog: Catalog) -> Catalog:
		if catalog_service.is_storable_id_faked(catalog.catalogId):
			catalog_service.redress_storable_id(catalog)
			topic_ids = ArrayHelper(catalog.topicIds).distinct().to_list()
			catalog.topicIds = topic_ids
			# check topics
			validate_topics(catalog_service, topic_ids, catalog.tenantId)
			# noinspection PyTypeChecker
			catalog: Catalog = catalog_service.create(catalog)
		else:
			existing_catalog: Optional[Catalog] = catalog_service.find_by_id(catalog.catalogId)
			if existing_catalog is not None:
				if existing_catalog.tenantId != catalog.tenantId:
					raise_403()

			topic_ids = ArrayHelper(catalog.topicIds).distinct().to_list()
			catalog.topicIds = topic_ids
			# check topics
			validate_topics(catalog_service, topic_ids, catalog.tenantId)
			# noinspection PyTypeChecker
			catalog: Catalog = catalog_service.update(catalog)
		return catalog

	return action


@router.post('/dqc/catalog', tags=[UserRole.ADMIN], response_model=Catalog)
async def save_catalog(
		catalog: Catalog, principal_service: PrincipalService = Depends(get_admin_principal)) -> Catalog:
	validate_tenant_id(catalog, principal_service)
	catalog_service = get_catalog_service(principal_service)
	action = ask_save_catalog_action(catalog_service, principal_service)
	return trans(catalog_service, lambda: action(catalog))


@router.post('/dqc/catalog/criteria', tags=[UserRole.ADMIN], response_model=List[Catalog])
async def query_catalog(
		criteria: CatalogCriteria, principal_service: PrincipalService = Depends(get_admin_principal)) -> List[Catalog]:
	catalog_service = get_catalog_service(principal_service)

	def action() -> List[Catalog]:
		tenant_id: TenantId = principal_service.get_tenant_id()
		return catalog_service.find_by_criteria(criteria, tenant_id)

	return trans_readonly(catalog_service, action)


@router.get('/dqc/catalog/delete', tags=[UserRole.ADMIN], response_class=Response)
async def delete_dashboard_by_id(
		catalog_id: Optional[CatalogId], principal_service: PrincipalService = Depends(get_admin_principal)
) -> None:
	if is_blank(catalog_id):
		raise_400('Catalog id is required.')

	catalog_service = get_catalog_service(principal_service)

	# noinspection DuplicatedCode
	def action() -> None:
		# noinspection PyTypeChecker
		existing_catalog: Optional[Catalog] = catalog_service.find_by_id(catalog_id)
		if existing_catalog is None:
			raise_404()
		if existing_catalog.tenantId != principal_service.get_tenant_id():
			raise_403()
		catalog_service.delete(catalog_id)

	trans(catalog_service, action)


@router.delete('/dqc/catalog', tags=[UserRole.SUPER_ADMIN], response_model=Catalog)
async def delete_catalog_by_id_by_super_admin(
		catalog_id: Optional[CatalogId] = None,
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> Catalog:
	if is_blank(catalog_id):
		raise_400('Catalog id is required.')

	catalog_service = get_catalog_service(principal_service)

	def action() -> Catalog:
		if principal_service.is_super_admin():
			# noinspection PyTypeChecker
			catalog: Optional[Catalog] = catalog_service.delete(catalog_id)
		else:
			existing_catalog = catalog_service.find_by_id(catalog_id)
			if existing_catalog is None:
				catalog = existing_catalog
			elif existing_catalog.tenantId != principal_service.get_tenant_id():
				catalog = None
			else:
				catalog = catalog_service.delete(catalog_id)
		if catalog is None:
			raise_404()
		return catalog

	return trans(catalog_service, action)
