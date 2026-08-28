from typing import List, Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.common import TenantId
from watchmen_storage import EntityShaper, EntityRow, EntityCriteriaExpression, ColumnNameLiteral
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank

from ..model.data_product import (
	DataAssetCatalog, DataProduct, AssetSnapshot,
)


# ============================================================================
# Catalog shaper
# ============================================================================

class DataAssetCatalogShaper(EntityShaper):

	def serialize(self, entity: DataAssetCatalog) -> EntityRow:
		row: EntityRow = TupleShaper.serialize_tenant_based(entity, {
			'catalog_id': entity.id,
			'name': entity.name,
			'description': entity.description,
			'parent_id': entity.parent_id,
			'order_index': entity.order_index,
		})
		return row

	def deserialize(self, row: EntityRow) -> DataAssetCatalog:
		return TupleShaper.deserialize_tenant_based(row, DataAssetCatalog(
			id=row.get('catalog_id'),
			name=row.get('name'),
			description=row.get('description'),
			parent_id=row.get('parent_id'),
			order_index=row.get('order_index') or 0,
		))


# ============================================================================
# Data product shaper: scalar columns for query + full ODPS structure in JSON
# ============================================================================

class DataProductShaper(EntityShaper):

	def serialize(self, entity: DataProduct) -> EntityRow:
		row: EntityRow = TupleShaper.serialize_tenant_based(entity, {
			'product_id': entity.id,
			'name': entity.name,
			'display_name': entity.display_name,
			'status': entity.status,
			'product_type': entity.product_type,
			'visibility': entity.visibility,
			'domain': entity.domain,
			'owner': entity.owner,
			'description': entity.description,
			'product_version': entity.product_version,
			'catalog_id': entity.catalog_id,
			'value_score': entity.value_score,
			'tags': entity.tags,
			'categories': entity.categories,
			'topic_ids': entity.topic_ids,
		})
		# the rest of the ODPS structure (ports, strategy, contract, sla, quality, pricing, ...)
		row['product'] = entity.model_dump()
		return row

	def deserialize(self, row: EntityRow) -> DataProduct:
		product = DataProduct.model_validate(row.get('product') or {})
		product.tenantId = row.get('tenant_id')
		product.id = row.get('product_id')
		product.createdAt = row.get('created_at')
		product.createdBy = row.get('created_by')
		product.lastModifiedAt = row.get('last_modified_at')
		product.lastModifiedBy = row.get('last_modified_by')
		product.version = row.get('version')
		return product


# ============================================================================
# Snapshot shaper
# ============================================================================

class AssetSnapshotShaper(EntityShaper):

	def serialize(self, entity: AssetSnapshot) -> EntityRow:
		row: EntityRow = TupleShaper.serialize_tenant_based(entity, {
			'snapshot_id': entity.id,
			'snapshot_date': entity.snapshot_date,
			'total_topics': entity.total_topics,
			'total_rows': entity.total_rows,
			'total_factors': entity.total_factors,
			'product_count': entity.product_count,
			'topic_sizes': ArrayHelper(entity.topic_sizes or []).map(lambda x: x.model_dump()).to_list(),
		})
		return row

	def deserialize(self, row: EntityRow) -> AssetSnapshot:
		return TupleShaper.deserialize_tenant_based(row, AssetSnapshot(
			id=row.get('snapshot_id'),
			snapshot_date=row.get('snapshot_date'),
			total_topics=row.get('total_topics') or 0,
			total_rows=row.get('total_rows') or 0,
			total_factors=row.get('total_factors') or 0,
			product_count=row.get('product_count') or 0,
			topic_sizes=row.get('topic_sizes') or [],
		))


CATALOG_ENTITY_NAME = 'data_asset_catalogs'
CATALOG_SHAPER = DataAssetCatalogShaper()
PRODUCT_ENTITY_NAME = 'data_products'
PRODUCT_SHAPER = DataProductShaper()
SNAPSHOT_ENTITY_NAME = 'data_asset_snapshots'
SNAPSHOT_SHAPER = AssetSnapshotShaper()


# ============================================================================
# Catalog service
# ============================================================================

class DataAssetCatalogService(TupleService):

	def __init__(self, storage, snowflake_generator, principal_service):
		super().__init__(storage, snowflake_generator, principal_service)

	def should_record_operation(self) -> bool:
		return True

	def get_entity_name(self) -> str:
		return CATALOG_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return CATALOG_SHAPER

	def get_storable_id(self, storable: DataAssetCatalog) -> str:
		return storable.id

	def set_storable_id(self, storable: DataAssetCatalog, storable_id: str) -> DataAssetCatalog:
		storable.id = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'catalog_id'

	def find_all(self) -> List[DataAssetCatalog]:
		tenant_id: TenantId = self.principalService.get_tenant_id()
		criteria = []
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		catalogs: List[DataAssetCatalog] = self.storage.find(self.get_entity_finder(criteria))
		return sorted(catalogs, key=lambda x: (x.order_index or 0, x.name or ''))

	def find_by_id(self, catalog_id: str) -> Optional[DataAssetCatalog]:
		if is_blank(catalog_id):
			return None
		tenant_id: TenantId = self.principalService.get_tenant_id()
		criteria = [
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='catalog_id'), right=catalog_id)
		]
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		rows: List[DataAssetCatalog] = self.storage.find(self.get_entity_finder(criteria))
		return rows[0] if rows else None

	def create(self, catalog: DataAssetCatalog) -> DataAssetCatalog:
		if is_blank(catalog.id):
			catalog.id = str(self.snowflakeGenerator.next_id())
		return super().create(catalog)

	def delete(self, catalog_id: str) -> None:
		if is_blank(catalog_id):
			return
		tenant_id: TenantId = self.principalService.get_tenant_id()
		criteria = [
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='catalog_id'), right=catalog_id)
		]
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		self.storage.delete(self.get_entity_deleter(criteria=criteria))


# ============================================================================
# Data product service
# ============================================================================

class DataProductService(TupleService):

	def __init__(self, storage, snowflake_generator, principal_service):
		super().__init__(storage, snowflake_generator, principal_service)

	def should_record_operation(self) -> bool:
		return True

	def get_entity_name(self) -> str:
		return PRODUCT_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return PRODUCT_SHAPER

	def get_storable_id(self, storable: DataProduct) -> str:
		return storable.id

	def set_storable_id(self, storable: DataProduct, storable_id: str) -> DataProduct:
		storable.id = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'product_id'

	def list_products(self, catalog_id: Optional[str] = None, query: Optional[str] = None) -> List[DataProduct]:
		tenant_id: TenantId = self.principalService.get_tenant_id()
		criteria = []
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		if is_not_blank(catalog_id):
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='catalog_id'), right=catalog_id))
		# noinspection PyTypeChecker
		products: List[DataProduct] = self.storage.find(self.get_entity_finder(criteria))
		if is_not_blank(query):
			q = query.lower()
			products = [
				p for p in products
				if (is_not_blank(p.name) and q in p.name.lower())
				or (is_not_blank(p.display_name) and q in p.display_name.lower())
				or (is_not_blank(p.description) and q in p.description.lower())
				or (is_not_blank(p.domain) and q in p.domain.lower())
				or ArrayHelper(p.tags or []).some(lambda t: is_not_blank(t) and q in t.lower())
			]
		return products

	def find_by_id(self, product_id: str) -> Optional[DataProduct]:
		if is_blank(product_id):
			return None
		tenant_id: TenantId = self.principalService.get_tenant_id()
		criteria = [
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='product_id'), right=product_id)
		]
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		rows: List[DataProduct] = self.storage.find(self.get_entity_finder(criteria))
		return rows[0] if rows else None

	def create(self, product: DataProduct) -> DataProduct:
		if is_blank(product.id):
			product.id = str(self.snowflakeGenerator.next_id())
		return super().create(product)

	def delete(self, product_id: str) -> None:
		if is_blank(product_id):
			return
		tenant_id: TenantId = self.principalService.get_tenant_id()
		criteria = [
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='product_id'), right=product_id)
		]
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		self.storage.delete(self.get_entity_deleter(criteria=criteria))


# ============================================================================
# Snapshot service
# ============================================================================

class AssetSnapshotService(TupleService):

	def __init__(self, storage, snowflake_generator, principal_service):
		super().__init__(storage, snowflake_generator, principal_service)

	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> str:
		return SNAPSHOT_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return SNAPSHOT_SHAPER

	def get_storable_id(self, storable: AssetSnapshot) -> str:
		return storable.id

	def set_storable_id(self, storable: AssetSnapshot, storable_id: str) -> AssetSnapshot:
		storable.id = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'snapshot_id'

	def list_snapshots(self) -> List[AssetSnapshot]:
		tenant_id: TenantId = self.principalService.get_tenant_id()
		criteria = []
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		snapshots: List[AssetSnapshot] = self.storage.find(self.get_entity_finder(criteria))
		return sorted(snapshots, key=lambda x: x.snapshot_date or '')

	def create(self, snapshot: AssetSnapshot) -> AssetSnapshot:
		if is_blank(snapshot.id):
			snapshot.id = str(self.snowflakeGenerator.next_id())
		return super().create(snapshot)


__all__ = [
	'DataAssetCatalogService', 'DataProductService', 'AssetSnapshotService',
	'DataAssetCatalogShaper', 'DataProductShaper', 'AssetSnapshotShaper',
	'CATALOG_ENTITY_NAME', 'PRODUCT_ENTITY_NAME', 'SNAPSHOT_ENTITY_NAME',
]
