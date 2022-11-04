from typing import List

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.common import TenantId
from watchmen_model.dqc import Catalog, CatalogCriteria, CatalogId
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaOperator, EntityRow, \
	EntityShaper
from watchmen_utilities import is_not_blank


class CatalogShaper(EntityShaper):
	def serialize(self, catalog: Catalog) -> EntityRow:
		return TupleShaper.serialize_tenant_based(catalog, {
			'catalog_id': catalog.catalogId,
			'name': catalog.name,
			'topic_ids': catalog.topicIds,
			'tech_owner_id': catalog.techOwnerId,
			'biz_owner_id': catalog.bizOwnerId,
			'tags': catalog.tags,
			'description': catalog.description
		})

	def deserialize(self, row: EntityRow) -> Catalog:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, Catalog(
			catalogId=row.get('catalog_id'),
			name=row.get('name'),
			topicIds=row.get('topic_ids'),
			techOwnerId=row.get('tech_owner_id'),
			bizOwnerId=row.get('biz_owner_id'),
			tags=row.get('tags'),
			description=row.get('description')
		))


CATALOG_ENTITY_NAME = 'catalogs'
CATALOG_ENTITY_SHAPER = CatalogShaper()


class CatalogService(TupleService):
	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> str:
		return CATALOG_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return CATALOG_ENTITY_SHAPER

	def get_storable_id(self, storable: Catalog) -> CatalogId:
		return storable.catalogId

	def set_storable_id(self, storable: Catalog, storable_id: CatalogId) -> Catalog:
		storable.catalogId = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'catalog_id'

	def find_by_criteria(self, criteria: CatalogCriteria, tenant_id: TenantId) -> List[Catalog]:
		storage_criteria = []
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			storage_criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		if is_not_blank(criteria.name):
			storage_criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='name'), operator=EntityCriteriaOperator.LIKE,
				right=criteria.name.strip()))
		if is_not_blank(criteria.techOwnerId):
			storage_criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='tech_owner_id'), right=criteria.techOwnerId))
		if is_not_blank(criteria.bizOwnerId):
			storage_criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='biz_owner_id'), right=criteria.bizOwnerId))
		if is_not_blank(criteria.topicId):
			storage_criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='topic_ids'), operator=EntityCriteriaOperator.LIKE,
				right=criteria.topicId))
		# noinspection PyTypeChecker

		return self.storage.find(self.get_entity_finder(criteria=storage_criteria))
