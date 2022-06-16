from typing import List, Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.admin import User, UserRole
from watchmen_model.common import DataPage, Pageable, TenantId, UserId
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaJoint, \
	EntityCriteriaJointConjunction, EntityCriteriaOperator, EntityRow, EntityShaper


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

	def get_storable_id(self, storable: User) -> UserId:
		return storable.userId

	def set_storable_id(self, storable: User, storable_id: UserId) -> User:
		storable.userId = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'user_id'

	# noinspection DuplicatedCode
	def find_page_by_text(self, text: Optional[str], tenant_id: Optional[TenantId], pageable: Pageable) -> DataPage:
		# always ignore super admin
		criteria = [
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='role'), operator=EntityCriteriaOperator.NOT_EQUALS,
				right=UserRole.SUPER_ADMIN)
		]
		if text is not None and len(text.strip()) != 0:
			criteria.append(EntityCriteriaJoint(
				conjunction=EntityCriteriaJointConjunction.OR,
				children=[
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName='name'), operator=EntityCriteriaOperator.LIKE, right=text),
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName='nickname'), operator=EntityCriteriaOperator.LIKE, right=text)
				]
			))
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		return self.storage.page(self.get_entity_pager(criteria=criteria, pageable=pageable))

	# noinspection DuplicatedCode
	def find_by_name(self, text: Optional[str], tenant_id: Optional[TenantId]) -> List[User]:
		# always ignore super admin
		criteria = [
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='role'), operator=EntityCriteriaOperator.NOT_EQUALS,
				right=UserRole.SUPER_ADMIN)
		]
		if text is not None and len(text.strip()) != 0:
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='name'), operator=EntityCriteriaOperator.LIKE, right=text))
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))

	def find_by_ids(self, user_ids: List[UserId], tenant_id: Optional[TenantId]) -> List[User]:
		# always ignore super admin
		criteria = [
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='role'), operator=EntityCriteriaOperator.NOT_EQUALS,
				right=UserRole.SUPER_ADMIN),
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='user_id'), operator=EntityCriteriaOperator.IN, right=user_ids)
		]
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria))

	def find_admin(self, tenant_id: TenantId) -> Optional[User]:
		criteria = [
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='role'), right=UserRole.ADMIN),
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id)
		]
		# noinspection PyTypeChecker
		admins: List[User] = self.storage.find(self.get_entity_finder(criteria=criteria))
		if len(admins) == 0:
			return None
		else:
			return admins[0]
