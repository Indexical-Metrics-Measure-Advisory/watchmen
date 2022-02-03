from watchmen_meta_service.common import TupleService, TupleShaper
from watchmen_model.admin import UserGroup
from watchmen_model.common import UserGroupId
from watchmen_storage import EntityRow, EntityShaper


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

	def get_tuple_id(self, a_tuple: UserGroup) -> UserGroupId:
		return a_tuple.userGroupId

	def set_tuple_id(self, a_tuple: UserGroup, tuple_id: UserGroupId) -> UserGroup:
		a_tuple.userGroupId = tuple_id
		return a_tuple

	def get_tuple_id_column_name(self) -> str:
		return 'user_group_id'
