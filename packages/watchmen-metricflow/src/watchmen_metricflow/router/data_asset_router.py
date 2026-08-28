from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.admin import TopicService
from watchmen_model.common import TenantId
from watchmen_rest import get_admin_principal, get_console_principal
from watchmen_rest.util import raise_400, raise_404
from watchmen_utilities import is_blank

from watchmen_metricflow.meta.data_product_meta_service import (
	DataAssetCatalogService, DataProductService,
)
from watchmen_metricflow.model.data_product import (
	DataAssetCatalog, DataProduct, DataProductStatus,
	DataAssetCatalogUpsert, DataProductUpsert, BatchCreateRequest, BatchDeleteRequest,
)
from watchmen_metricflow.service.asset_statistics_service import (
	AssetMapResponse, build_asset_map, create_snapshot,
)
from watchmen_metricflow.util import trans, trans_readonly

router = APIRouter()


def get_catalog_service(principal_service: PrincipalService) -> DataAssetCatalogService:
	return DataAssetCatalogService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_product_service(principal_service: PrincipalService) -> DataProductService:
	return DataProductService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


# ============================================================================
# Catalog (custom directory tree) CRUD
# ============================================================================

@router.get('/metricflow/data-assets/catalogs', tags=['CONSOLE', 'ADMIN'], response_model=List[DataAssetCatalog])
async def list_catalogs(
		principal_service: PrincipalService = Depends(get_console_principal)
) -> List[DataAssetCatalog]:
	service = get_catalog_service(principal_service)

	def action() -> List[DataAssetCatalog]:
		return service.find_all()

	return trans_readonly(service, action)


@router.post('/metricflow/data-assets/catalogs', tags=['ADMIN'], response_model=DataAssetCatalog)
async def create_catalog(
		upsert: DataAssetCatalogUpsert,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> DataAssetCatalog:
	if is_blank(upsert.name):
		raise_400('Catalog name is required.')

	service = get_catalog_service(principal_service)

	def action() -> DataAssetCatalog:
		catalog = DataAssetCatalog(
			name=upsert.name,
			description=upsert.description,
			parent_id=upsert.parent_id,
			order_index=upsert.order_index,
			tenantId=principal_service.get_tenant_id(),
		)
		return service.create(catalog)

	return trans(service, action)


@router.post('/metricflow/data-assets/catalogs/update', tags=['ADMIN'], response_model=DataAssetCatalog)
async def update_catalog(
		upsert: DataAssetCatalogUpsert,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> DataAssetCatalog:
	if is_blank(upsert.id) or is_blank(upsert.name):
		raise_400('Catalog id and name are required.')

	service = get_catalog_service(principal_service)

	def action() -> DataAssetCatalog:
		existing = service.find_by_id(upsert.id)
		if existing is None:
			raise_404()
		if upsert.parent_id == upsert.id:
			raise_400('Catalog parent cannot be itself.')
		existing.name = upsert.name
		existing.description = upsert.description
		existing.parent_id = upsert.parent_id
		existing.order_index = upsert.order_index
		return service.update(existing)

	return trans(service, action)


@router.post('/metricflow/data-assets/catalogs/delete', tags=['ADMIN'])
async def delete_catalog(
		upsert: DataAssetCatalogUpsert,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> dict:
	if is_blank(upsert.id):
		raise_400('Catalog id is required.')

	catalog_service = get_catalog_service(principal_service)
	product_service = get_product_service(principal_service)

	def action() -> dict:
		existing = catalog_service.find_by_id(upsert.id)
		if existing is None:
			raise_404()
		children = [c for c in catalog_service.find_all() if c.parent_id == upsert.id]
		if children:
			raise_400('Catalog has sub catalogs, delete them first.')
		products = product_service.list_products(catalog_id=upsert.id)
		if products:
			raise_400('Catalog contains data products, move or delete them first.')
		catalog_service.delete(upsert.id)
		return {'catalogId': upsert.id, 'deleted': True}

	return trans(catalog_service, action)


# ============================================================================
# Data product CRUD
# ============================================================================

@router.get('/metricflow/data-assets/products', tags=['CONSOLE', 'ADMIN'], response_model=List[DataProduct])
async def list_products(
		catalogId: Optional[str] = Query(None, description='Filter by catalog id'),
		q: Optional[str] = Query(None, description='Search in name/display name/description/domain/tags'),
		principal_service: PrincipalService = Depends(get_console_principal)
) -> List[DataProduct]:
	service = get_product_service(principal_service)

	def action() -> List[DataProduct]:
		return service.list_products(catalog_id=catalogId, query=q)

	return trans_readonly(service, action)


@router.get('/metricflow/data-assets/products/{product_id}', tags=['CONSOLE', 'ADMIN'], response_model=DataProduct)
async def get_product(
		product_id: str,
		principal_service: PrincipalService = Depends(get_console_principal)
) -> DataProduct:
	service = get_product_service(principal_service)

	def action() -> DataProduct:
		product = service.find_by_id(product_id)
		if product is None:
			raise_404()
		return product

	return trans_readonly(service, action)


@router.post('/metricflow/data-assets/products', tags=['ADMIN'], response_model=DataProduct)
async def create_product(
		upsert: DataProductUpsert,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> DataProduct:
	if is_blank(upsert.name):
		raise_400('Data product name is required.')

	service = get_product_service(principal_service)

	def action() -> DataProduct:
		product = _build_product(upsert)
		product.tenantId = principal_service.get_tenant_id()
		return service.create(product)

	return trans(service, action)


@router.post('/metricflow/data-assets/products/update', tags=['ADMIN'], response_model=DataProduct)
async def update_product(
		upsert: DataProductUpsert,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> DataProduct:
	if is_blank(upsert.id) or is_blank(upsert.name):
		raise_400('Data product id and name are required.')

	service = get_product_service(principal_service)

	def action() -> DataProduct:
		existing = service.find_by_id(upsert.id)
		if existing is None:
			raise_404()
		product = _build_product(upsert, existing)
		return service.update(product)

	return trans(service, action)


@router.post('/metricflow/data-assets/products/delete', tags=['ADMIN'])
async def delete_product(
		upsert: DataProductUpsert,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> dict:
	if is_blank(upsert.id):
		raise_400('Data product id is required.')

	service = get_product_service(principal_service)

	def action() -> dict:
		existing = service.find_by_id(upsert.id)
		if existing is None:
			raise_404()
		service.delete(upsert.id)
		return {'productId': upsert.id, 'deleted': True}

	return trans(service, action)


@router.post('/metricflow/data-assets/products/batch-delete', tags=['ADMIN'])
async def batch_delete_products(
		request: BatchDeleteRequest,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> dict:
	if not request.product_ids:
		raise_400('Product ids are required.')

	service = get_product_service(principal_service)

	def action() -> dict:
		deleted = []
		for product_id in request.product_ids:
			if service.find_by_id(product_id) is not None:
				service.delete(product_id)
				deleted.append(product_id)
		return {'deleted': deleted}

	return trans(service, action)


@router.post('/metricflow/data-assets/products/batch-create', tags=['ADMIN'], response_model=List[DataProduct])
async def batch_create_products(
		request: BatchCreateRequest,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> List[DataProduct]:
	if not request.topic_ids:
		raise_400('Topic ids are required.')

	product_service = get_product_service(principal_service)
	topic_service = get_topic_service(principal_service)

	def action() -> List[DataProduct]:
		tenant_id: TenantId = principal_service.get_tenant_id()
		created: List[DataProduct] = []
		for topic_id in request.topic_ids:
			topic = topic_service.find_by_id(topic_id)
			if topic is None:
				continue
			product = DataProduct(
				name=topic.name,
				display_name=topic.name,
				description=f'Data product generated from topic [{topic.name}].',
				status=request.status or DataProductStatus.DRAFT,
				topic_ids=[topic_id],
				catalog_id=request.catalog_id,
				domain=request.domain,
				value_score=request.value_score or 0,
				tenantId=tenant_id,
			)
			created.append(product_service.create(product))
		return created

	return trans(product_service, action)


# ============================================================================
# Table (topic) details
# ============================================================================

@router.get('/metricflow/data-assets/topics/{topic_id}/details', tags=['CONSOLE', 'ADMIN'])
async def get_topic_details(
		topic_id: str,
		principal_service: PrincipalService = Depends(get_console_principal)
) -> dict:
	from watchmen_metricflow.service.asset_statistics_service import count_topic_rows

	topic_service = get_topic_service(principal_service)

	def action() -> dict:
		topic = topic_service.find_by_id(topic_id)
		if topic is None:
			raise_404()
		rows = count_topic_rows(topic, principal_service)
		return {
			'topicId': topic.topicId,
			'name': topic.name,
			'type': topic.type,
			'kind': topic.kind,
			'dataSourceId': topic.dataSourceId,
			'description': topic.description,
			'rows': rows,
			'factorCount': len(topic.factors or []),
			'factors': [
				{
					'name': factor.name,
					'label': factor.label,
					'type': factor.type,
					'description': factor.description,
				}
				for factor in (topic.factors or [])
			],
			'tags': topic.tags,
			'lastModifiedAt': topic.lastModifiedAt,
		}

	return trans_readonly(topic_service, action)


# ============================================================================
# Asset map
# ============================================================================

@router.get('/metricflow/data-assets/map', tags=['CONSOLE', 'ADMIN'], response_model=AssetMapResponse)
async def get_asset_map(
		principal_service: PrincipalService = Depends(get_console_principal)
) -> AssetMapResponse:
	return build_asset_map(principal_service)


@router.post('/metricflow/data-assets/map/snapshot', tags=['ADMIN'])
async def take_snapshot(
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> dict:
	snapshot = create_snapshot(principal_service)
	return {
		'snapshotId': snapshot.id,
		'snapshotDate': snapshot.snapshot_date,
		'totalRows': snapshot.total_rows,
		'totalTopics': snapshot.total_topics,
		'productCount': snapshot.product_count,
	}


@router.get('/metricflow/data-assets/map/snapshots', tags=['CONSOLE', 'ADMIN'])
async def list_snapshots(
		principal_service: PrincipalService = Depends(get_console_principal)
) -> List[dict]:
	from watchmen_metricflow.meta.data_product_meta_service import AssetSnapshotService
	service = AssetSnapshotService(ask_meta_storage(), ask_snowflake_generator(), principal_service)

	def action() -> List[dict]:
		snapshots = service.list_snapshots()
		return [
			{
				'snapshotId': s.id,
				'snapshotDate': s.snapshot_date,
				'totalTopics': s.total_topics,
				'totalRows': s.total_rows,
				'totalFactors': s.total_factors,
				'productCount': s.product_count,
			}
			for s in snapshots
		]

	return trans_readonly(service, action)


# ============================================================================
# Internals
# ============================================================================

def _build_product(upsert: DataProductUpsert, existing: Optional[DataProduct] = None) -> DataProduct:
	if existing is not None:
		product = existing
	else:
		product = DataProduct(name=upsert.name)
	# simple scalars, only overwrite when provided
	assignments = {
		'name': upsert.name,
		'display_name': upsert.display_name,
		'product_id': upsert.product_id,
		'value_proposition': upsert.value_proposition,
		'description': upsert.description,
		'product_version': upsert.product_version,
		'version_notes': upsert.version_notes,
		'logo_url': upsert.logo_url,
		'owner': upsert.owner,
		'owner_display_name': upsert.owner_display_name,
		'product_manager': upsert.product_manager,
		'maintainer': upsert.maintainer,
		'domain': upsert.domain,
		'license': upsert.license,
		'data_holder': upsert.data_holder,
		'catalog_id': upsert.catalog_id,
		'value_score': upsert.value_score,
	}
	for key, value in assignments.items():
		if value is not None:
			setattr(product, key, value)
	if upsert.visibility is not None:
		product.visibility = upsert.visibility
	if upsert.status is not None:
		product.status = upsert.status
	if upsert.product_type is not None:
		product.product_type = upsert.product_type
	if upsert.portfolio_priority is not None:
		product.portfolio_priority = upsert.portfolio_priority
	if upsert.governance_profile is not None:
		product.governance_profile = upsert.governance_profile
	for key in ('categories', 'standards', 'tags', 'output_formats', 'use_cases',
				'recommended_data_products', 'pricing_plans', 'input_ports', 'output_ports',
				'supporting_elements', 'custom_properties', 'topic_ids'):
		value = getattr(upsert, key, None)
		if value is not None:
			setattr(product, key, value)
	if upsert.product_strategy is not None:
		product.product_strategy = upsert.product_strategy
	if upsert.contract is not None:
		product.contract = upsert.contract
	if upsert.sla is not None:
		product.sla = upsert.sla
	if upsert.data_quality is not None:
		product.data_quality = upsert.data_quality
	return product
