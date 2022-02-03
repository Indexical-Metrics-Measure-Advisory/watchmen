from typing import List

from watchmen_meta_service.common import TupleService, TupleShaper
from watchmen_model.admin import Enum, EnumItem
from watchmen_model.common import EnumId, EnumItemId
from watchmen_storage import EntityCriteriaExpression, EntityRow, EntityShaper


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

	def get_tuple_id(self, a_tuple: Enum) -> EnumId:
		return a_tuple.enumId

	def set_tuple_id(self, a_tuple: Enum, tuple_id: EnumId) -> Enum:
		a_tuple.enumId = tuple_id
		return a_tuple

	def get_tuple_id_column_name(self) -> str:
		return 'enum_id'


class EnumItemShaper(EntityShaper):
	def serialize(self, enum_item: EnumItem) -> EntityRow:
		return TupleShaper.serialize_tenant_based(enum_item, {
			'item_id': enum_item.itemId,
			'code': enum_item.code,
			'label': enum_item.label,
			'parent_code': enum_item.parentCode,
			'replace_code': enum_item.replaceCode,
			'enum_id': enum_item.enumId
		})

	def deserialize(self, row: EntityRow) -> EnumItem:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, Enum(
			itemId=row.get('item_id'),
			code=row.get('code'),
			label=row.get('label'),
			parentCode=row.get('parent_code'),
			replaceCode=row.get('replace_code'),
			enumId=row.get('enum_id')
		))


ENUM_ITEM_ENTITY_NAME = 'enum_items'
ENUM_ITEM_ENTITY_SHAPER = EnumItemShaper()


class EnumItemService(TupleService):
	def get_entity_name(self) -> str:
		return ENUM_ITEM_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return ENUM_ITEM_ENTITY_SHAPER

	def get_tuple_id(self, a_tuple: EnumItem) -> EnumId:
		return a_tuple.itemId

	def set_tuple_id(self, a_tuple: EnumItem, tuple_id: EnumItemId) -> EnumItem:
		a_tuple.itemId = tuple_id
		return a_tuple

	def get_tuple_id_column_name(self) -> str:
		return 'item_id'

	def find_by_enum_id(self, enum_id: EnumId) -> List[EnumItem]:
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder([
			EntityCriteriaExpression(name='enum_id', value=enum_id)
		]))

	def delete_by_enum_id(self, enum_id: EnumId) -> None:
		self.storage.delete(self.get_entity_deleter([
			EntityCriteriaExpression(name='enum_id', value=enum_id)
		]))
