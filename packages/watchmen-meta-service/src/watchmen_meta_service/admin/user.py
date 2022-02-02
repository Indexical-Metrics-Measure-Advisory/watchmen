from typing import List, Optional

from watchmen_meta_service.common import TupleService, TupleShaper
from watchmen_model.admin import User, UserRole
from watchmen_model.common import DataPage, Pageable, TenantId, UserId
from watchmen_storage import EntityCriteriaExpression, EntityCriteriaOperator, EntityFinder, EntityPager, EntityRow, \
	EntityShaper


class UserShaper(EntityShaper):
	def serialize(self, user: User) -> EntityRow:
		return TupleShaper.serialize_tenant_based(user, {
			'user_id': user.userId,
			'name': user.name,
			'nickname': user.nickName,
			'password': user.password,
			'is_active': user.isActive,
			'group_ids': user.groupIds,
			'role': user.role,
		})

	def deserialize(self, row: EntityRow) -> User:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, User(
			userId=row.get('user_id'),
			name=row.get('name'),
			nickName=row.get('nickname'),
			password=row.get('password'),
			isActive=row.get('is_active'),
			groupIds=row.get('group_ids'),
			role=row.get('role')
		))


USER_ENTITY_NAME = 'users'
USER_ENTITY_SHAPER = UserShaper()


class UserService(TupleService):
	def get_entity_name(self) -> str:
		return USER_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return USER_ENTITY_SHAPER

	def get_tuple_id(self, a_tuple: User) -> UserId:
		return a_tuple.userId

	def set_tuple_id(self, a_tuple: User, tuple_id: UserId) -> User:
		a_tuple.userId = tuple_id
		return a_tuple

	def get_tuple_id_column_name(self) -> str:
		return 'user_id'

	#
	# def find_by_name(self, username: Optional[str]) -> Optional[User]:
	# 	if username is None or len(username.strip()) == 0:
	# 		return None
	# 	return self.storage.find_one(EntityFinder(
	# 		name=self.get_entity_name(),
	# 		shaper=self.get_entity_shaper(),
	# 		criteria=[
	# 			EntityCriteriaExpression(name='name', value=username)
	# 		]
	# 	))

	def find_users_by_text(self, text: Optional[str], tenant_id: Optional[TenantId], pageable: Pageable) -> DataPage:
		# always ignore super admin
		criteria = [
			EntityCriteriaExpression(
				name='role', operator=EntityCriteriaOperator.NOT_EQUALS, value=UserRole.SUPER_ADMIN)
		]
		if text is not None and len(text.strip()) != 0:
			criteria.append(EntityCriteriaExpression(name='name', operator=EntityCriteriaOperator.LIKE, value=text))
			criteria.append(EntityCriteriaExpression(name='nickname', operator=EntityCriteriaOperator.LIKE, value=text))
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(name='tenant_id', value=tenant_id))
		return self.storage.page(EntityPager(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=criteria,
			pageable=pageable
		))

	def find_by_ids(self, user_ids: List[UserId], tenant_id: Optional[TenantId]) -> List[User]:
		# always ignore super admin
		criteria = [
			EntityCriteriaExpression(
				name='role', operator=EntityCriteriaOperator.NOT_EQUALS, value=UserRole.SUPER_ADMIN),
			EntityCriteriaExpression(name='user_id', operator=EntityCriteriaOperator.IN, value=user_ids)
		]
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(name='tenant_id', value=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(EntityFinder(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=criteria,
		))
