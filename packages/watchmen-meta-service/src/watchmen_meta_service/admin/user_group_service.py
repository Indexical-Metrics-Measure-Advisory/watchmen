from typing import List, Optional

from watchmen_meta_service.common import TupleService, TupleShaper
from watchmen_model.admin import UserGroup
from watchmen_model.common import DataPage, Pageable, TenantId, UserGroupId
from watchmen_storage import EntityCriteriaExpression, EntityCriteriaOperator, EntityRow, EntityShaper


class UserGroupShaper(EntityShaper):
	def serialize(self, user_group: UserGroup) -> EntityRow:
		return TupleShaper.serialize_tenant_based(user_group, {
			'user_group_id': user_group.userGroupId,
			'name': user_group.name,
			'description': user_group.description,
			'user_ids': user_group.userIds,
			'space_ids': user_group.spaceIds,
		})

	def deserialize(self, row: EntityRow) -> UserGroup:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, UserGroup(
			userGroupId=row.get('user_group_id'),
			name=row.get('name'),
			description=row.get('description'),
			userIds=row.get('user_ids'),
			spaceIds=row.get('space_ids')
		))


USER_GROUP_ENTITY_NAME = 'user_groups'
USER_GROUP_ENTITY_SHAPER = UserGroupShaper()


class UserGroupService(TupleService):
	def get_entity_name(self) -> str:
		return USER_GROUP_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return USER_GROUP_ENTITY_SHAPER

	def get_storable_id(self, storable: UserGroup) -> UserGroupId:
		return storable.userGroupId

	def set_storable_id(self, storable: UserGroup, storable_id: UserGroupId) -> UserGroup:
		storable.userGroupId = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'user_group_id'

	# noinspection DuplicatedCode
	def find_page_by_text(self, text: Optional[str], tenant_id: Optional[TenantId], pageable: Pageable) -> DataPage:
		criteria = []
		if text is not None and len(text.strip()) != 0:
			criteria.append(EntityCriteriaExpression(name='name', operator=EntityCriteriaOperator.LIKE, value=text))
			criteria.append(
				EntityCriteriaExpression(name='description', operator=EntityCriteriaOperator.LIKE, value=text))
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(name='tenant_id', value=tenant_id))
		return self.storage.page(self.get_entity_pager(criteria=criteria, pageable=pageable))

	# noinspection DuplicatedCode
	def find_by_name(self, text: Optional[str], tenant_id: Optional[TenantId]) -> List[UserGroup]:
		criteria = []
		if text is not None and len(text.strip()) != 0:
			criteria.append(EntityCriteriaExpression(name='name', operator=EntityCriteriaOperator.LIKE, value=text))
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(name='tenant_id', value=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))

	def find_by_ids(self, user_group_ids: List[UserGroupId], tenant_id: Optional[TenantId]) -> List[UserGroup]:
		criteria = [
			EntityCriteriaExpression(name='user_group_id', operator=EntityCriteriaOperator.IN, value=user_group_ids)
		]
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(name='tenant_id', value=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria))
