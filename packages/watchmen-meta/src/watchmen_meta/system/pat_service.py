from typing import List, Optional

from watchmen_auth import PrincipalService
from watchmen_meta.common import StorageService
from watchmen_model.common import PatId, TenantId, UserId
from watchmen_model.system import PersonalAccessToken
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityFinder, EntityHelper, EntityIdHelper, \
	EntityRow, EntityShaper, SnowflakeGenerator, TransactionalStorageSPI
from watchmen_utilities import get_current_time_in_seconds


class PatShaper(EntityShaper):
	def serialize(self, pat: PersonalAccessToken) -> EntityRow:
		return {
			'pat_id': pat.patId,
			'token': pat.token,
			'user_id': pat.userId,
			'username': pat.username,
			'tenant_id': pat.tenantId,
			'note': pat.note,
			'expired': pat.expired,
			'permissions': pat.permissions,
			'created_at': pat.createdAt
		}

	def deserialize(self, row: EntityRow) -> PersonalAccessToken:
		return PersonalAccessToken(
			patId=row.get('pat_id'),
			token=row.get('token'),
			userId=row.get('user_id'),
			username=row.get('username'),
			tenantId=row.get('tenant_id'),
			note=row.get('note'),
			expired=row.get('expired'),
			permissions=row.get('permissions'),
			createdAt=row.get('created_at')
		)


PAT_ENTITY_NAME = 'pats'
PAT_ENTITY_SHAPER = PatShaper()


class PatService(StorageService):
	def __init__(
			self,
			storage: TransactionalStorageSPI,
			snowflake_generator: SnowflakeGenerator,
			principal_service: PrincipalService
	):
		super().__init__(storage)
		self.with_snowflake_generator(snowflake_generator)
		self.with_principal_service(principal_service)

	# noinspection PyMethodMayBeStatic
	def get_entity_name(self) -> str:
		return PAT_ENTITY_NAME

	# noinspection PyMethodMayBeStatic
	def get_entity_shaper(self) -> EntityShaper:
		return PAT_ENTITY_SHAPER

	def get_entity_helper(self) -> EntityHelper:
		return EntityHelper(name=self.get_entity_name(), shaper=self.get_entity_shaper())

	def generate_pat_id(self) -> PatId:
		return str(self.snowflakeGenerator.next_id())

	# noinspection PyMethodMayBeStatic
	def get_pat_id_column_name(self) -> str:
		return 'pat_id'

	def get_entity_id_helper(self) -> EntityIdHelper:
		return EntityIdHelper(
			name=self.get_entity_name(), shaper=self.get_entity_shaper(), idColumnName=self.get_pat_id_column_name())

	def create(self, a_pat: PersonalAccessToken) -> PersonalAccessToken:
		a_pat.patId = self.generate_pat_id()
		a_pat.createdAt = get_current_time_in_seconds()

		self.storage.insert_one(a_pat, self.get_entity_helper())
		return a_pat

	def find_by_id(self, pat_id: PatId, user_id: UserId, tenant_id: TenantId) -> Optional[PersonalAccessToken]:
		# noinspection PyTypeChecker
		pat: PersonalAccessToken = self.storage.find_one(EntityFinder(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=[
				EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName=self.get_pat_id_column_name()), right=pat_id),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='user_id'), right=user_id),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id)
			]
		))
		if pat is None:
			return None
		return pat

	def find_by_user_id(self, user_id: UserId, tenant_id: TenantId) -> List[PersonalAccessToken]:
		# noinspection PyTypeChecker
		return self.storage.find(EntityFinder(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='user_id'), right=user_id),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id)
			]
		))

	def delete_by_id(self, pat_id: PatId) -> None:
		self.storage.delete_by_id(pat_id, EntityIdHelper(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			idColumnName=self.get_pat_id_column_name()
		))
