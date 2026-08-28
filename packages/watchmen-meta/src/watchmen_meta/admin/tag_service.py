from typing import List, Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.admin import Tag, TagType
from watchmen_model.common import DataPage, Pageable, TagId, TenantId
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaJoint, \
	EntityCriteriaJointConjunction, EntityCriteriaOperator, EntityRow, EntityShaper
from watchmen_utilities import is_not_blank


class TagShaper(EntityShaper):
	def serialize(self, tag: Tag) -> EntityRow:
		return TupleShaper.serialize_tenant_based(tag, {
			'tag_id': tag.tagId,
			'name': tag.name,
			'type': tag.type,
			'description': tag.description
		})

	def deserialize(self, row: EntityRow) -> Tag:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, Tag(
			tagId=row.get('tag_id'),
			name=row.get('name'),
			type=row.get('type'),
			description=row.get('description')
		))


TAG_ENTITY_NAME = 'tags'
TAG_ENTITY_SHAPER = TagShaper()


class TagService(TupleService):
	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> str:
		return TAG_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return TAG_ENTITY_SHAPER

	def get_storable_id(self, storable: Tag) -> TagId:
		return storable.tagId

	def set_storable_id(self, storable: Tag, storable_id: TagId) -> Tag:
		storable.tagId = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'tag_id'

	def find_by_name(self, name: str, tag_type: TagType, tenant_id: Optional[TenantId]) -> Optional[Tag]:
		criteria = [
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='name'), right=name),
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='type'), right=tag_type.value)
		]
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		return self.storage.find_one(self.get_entity_finder(criteria))

	# noinspection DuplicatedCode
	def find_by_text(
			self, text: Optional[str], tag_type: Optional[TagType], tenant_id: Optional[TenantId],
			pageable: Pageable) -> DataPage:
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
		if tag_type is not None:
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='type'), right=tag_type.value))
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		return self.storage.page(self.get_entity_pager(criteria, pageable))

	def find_all_by_type(self, tag_type: TagType, tenant_id: Optional[TenantId]) -> List[Tag]:
		criteria = [
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='type'), right=tag_type.value)
		]
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria))
