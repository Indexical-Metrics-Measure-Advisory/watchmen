from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.dqc import Catalog, CatalogId
from watchmen_storage import EntityRow, EntityShaper


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

# # noinspection DuplicatedCode
# def find_page_by_text(self, text: Optional[str], tenant_id: Optional[TenantId], pageable: Pageable) -> DataPage:
# 	criteria = []
# 	if text is not None and len(text.strip()) != 0:
# 		criteria.append(EntityCriteriaJoint(
# 			conjunction=EntityCriteriaJointConjunction.OR,
# 			children=[
# 				EntityCriteriaExpression(
# 					left=ColumnNameLiteral(columnName='name'), operator=EntityCriteriaOperator.LIKE, right=text),
# 				EntityCriteriaExpression(
# 					left=ColumnNameLiteral(columnName='description'), operator=EntityCriteriaOperator.LIKE,
# 					right=text)
# 			]
# 		))
# 	if tenant_id is not None and len(tenant_id.strip()) != 0:
# 		criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
# 	return self.storage.page(self.get_entity_pager(criteria=criteria, pageable=pageable))
#
# # noinspection DuplicatedCode
# def find_by_name(self, text: Optional[str], tenant_id: Optional[TenantId]) -> List[Catalog]:
# 	criteria = []
# 	if text is not None and len(text.strip()) != 0:
# 		criteria.append(EntityCriteriaExpression(
# 			left=ColumnNameLiteral(columnName='name'), operator=EntityCriteriaOperator.LIKE, right=text))
# 	if tenant_id is not None and len(tenant_id.strip()) != 0:
# 		criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
# 	# noinspection PyTypeChecker
# 	return self.storage.find(self.get_entity_finder(criteria=criteria))
#
# def find_by_ids(self, space_ids: List[CatalogId], tenant_id: Optional[TenantId]) -> List[Catalog]:
# 	criteria = [
# 		EntityCriteriaExpression(
# 			left=ColumnNameLiteral(columnName='space_id'), operator=EntityCriteriaOperator.IN, right=space_ids)
# 	]
# 	if tenant_id is not None and len(tenant_id.strip()) != 0:
# 		criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
# 	# noinspection PyTypeChecker
# 	return self.storage.find(self.get_entity_finder(criteria))
#
# # noinspection DuplicatedCode
# def find_all(self, tenant_id: Optional[TenantId]) -> List[Catalog]:
# 	criteria = []
# 	if tenant_id is not None and len(tenant_id.strip()) != 0:
# 		criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
# 	# noinspection PyTypeChecker
# 	return self.storage.find(self.get_entity_finder(criteria=criteria))
