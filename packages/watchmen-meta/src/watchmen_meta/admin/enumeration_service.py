from typing import List, Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.admin import Enum, EnumItem
from watchmen_model.common import DataPage, EnumId, EnumItemId, Pageable, TenantId
from watchmen_storage import ColumnNameLiteral, EntityCriteria, EntityCriteriaExpression, EntityCriteriaJoint, \
	EntityCriteriaJointConjunction, EntityCriteriaOperator, EntityDeleter, EntityFinder, EntityHelper, EntityRow, \
	EntityShaper, EntitySort, SnowflakeGenerator, TransactionalStorageSPI


class EnumShaper(EntityShaper):
	def serialize(self, an_enum: Enum) -> EntityRow:
		return TupleShaper.serialize_tenant_based(an_enum, {
			'enum_id': an_enum.enumId,
			'name': an_enum.name,
			'description': an_enum.description,
			'parent_enum_id': an_enum.parentEnumId
		})

	def deserialize(self, row: EntityRow) -> Enum:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, Enum(
			enumId=row.get('enum_id'),
			name=row.get('name'),
			description=row.get('description'),
			parentEnumId=row.get('parent_enum_id')
		))


ENUM_ENTITY_NAME = 'enums'
ENUM_ENTITY_SHAPER = EnumShaper()


class EnumService(TupleService):
	def get_entity_name(self) -> str:
		return ENUM_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return ENUM_ENTITY_SHAPER

	def get_storable_id(self, storable: Enum) -> EnumId:
		return storable.enumId

	def set_storable_id(self, storable: Enum, storable_id: EnumId) -> Enum:
		storable.enumId = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'enum_id'

	def find_by_name(self, name: str, tenant_id: Optional[TenantId]) -> Optional[Enum]:
		criteria = [EntityCriteriaExpression(left=ColumnNameLiteral(columnName='name'), right=name)]
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		return self.storage.find_one(self.get_entity_finder(criteria))

	# noinspection DuplicatedCode
	def find_by_text(self, text: Optional[str], tenant_id: Optional[TenantId], pageable: Pageable) -> DataPage:
		criteria = []
		if text is not None and len(text.strip()) != 0:
			criteria.append(EntityCriteriaJoint(
				conjunction=EntityCriteriaJointConjunction.OR,
				children=[
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName='name'), operator=EntityCriteriaOperator.LIKE, right=text),
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName='description'), operator=EntityCriteriaOperator.LIKE,
						right=text)
				]
			))
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		return self.storage.page(self.get_entity_pager(criteria, pageable))

	def find_all(self, tenant_id: Optional[TenantId]) -> List[Enum]:
		criteria = []
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria))


class EnumItemShaper(EntityShaper):
	def serialize(self, enum_item: EnumItem) -> EntityRow:
		return {
			'item_id': enum_item.itemId,
			'code': enum_item.code,
			'label': enum_item.label,
			'parent_code': enum_item.parentCode,
			'replace_code': enum_item.replaceCode,
			'enum_id': enum_item.enumId,
			'tenant_id': enum_item.tenantId
		}

	def deserialize(self, row: EntityRow) -> EnumItem:
		# noinspection PyTypeChecker
		return EnumItem(
			itemId=row.get('item_id'),
			code=row.get('code'),
			label=row.get('label'),
			parentCode=row.get('parent_code'),
			replaceCode=row.get('replace_code'),
			enumId=row.get('enum_id'),
			tenantId=row.get('tenant_id')
		)


ENUM_ITEM_ENTITY_NAME = 'enum_items'
ENUM_ITEM_ENTITY_SHAPER = EnumItemShaper()


class EnumItemService:
	storage: TransactionalStorageSPI

	def __init__(self, storage: TransactionalStorageSPI, snowflake_generator: SnowflakeGenerator):
		self.storage = storage
		self.snowflakeGenerator = snowflake_generator

	# noinspection PyMethodMayBeStatic
	def get_entity_name(self) -> str:
		return ENUM_ITEM_ENTITY_NAME

	# noinspection PyMethodMayBeStatic
	def get_entity_shaper(self) -> EntityShaper:
		return ENUM_ITEM_ENTITY_SHAPER

	def get_entity_helper(self) -> EntityHelper:
		return EntityHelper(name=self.get_entity_name(), shaper=self.get_entity_shaper())

	def get_entity_finder(self, criteria: EntityCriteria, sort: Optional[EntitySort] = None) -> EntityFinder:
		return EntityFinder(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=criteria,
			sort=sort
		)

	def get_entity_deleter(self, criteria: EntityCriteria) -> EntityDeleter:
		return EntityDeleter(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=criteria
		)

	def generate_item_id(self) -> EnumItemId:
		return str(self.snowflakeGenerator.next_id())

	def redress_item_id(self, enum_item: EnumItem) -> EnumItem:
		"""
		return exactly the given tuple, replace by generated id if it is faked
		"""
		if TupleService.is_storable_id_faked(enum_item.itemId):
			enum_item.itemId = self.generate_item_id()
		return enum_item

	def create(self, enum_item: EnumItem) -> EnumItem:
		self.storage.insert_one(enum_item, self.get_entity_helper())
		return enum_item

	def find_by_enum_id(self, enum_id: EnumId) -> List[EnumItem]:
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder([
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='enum_id'), right=enum_id)
		]))

	def delete_by_enum_id(self, enum_id: EnumId) -> None:
		self.storage.delete(self.get_entity_deleter([
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='enum_id'), right=enum_id)
		]))
