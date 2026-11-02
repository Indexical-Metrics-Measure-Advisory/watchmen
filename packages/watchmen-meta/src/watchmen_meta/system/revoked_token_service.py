from typing import Optional

from watchmen_auth import PrincipalService
from watchmen_meta.common import StorageService
from watchmen_model.system import RevokedToken
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaOperator, EntityDeleter, \
	EntityFinder, EntityHelper, EntityRow, EntityShaper, SnowflakeGenerator, TransactionalStorageSPI
from watchmen_utilities import get_current_time_in_seconds


class RevokedTokenShaper(EntityShaper):
	def serialize(self, revoked: RevokedToken) -> EntityRow:
		return {
			'jti': revoked.jti,
			'user_id': revoked.userId,
			'tenant_id': revoked.tenantId,
			'expires_at': revoked.expiresAt,
			'revoked_at': revoked.revokedAt
		}

	def deserialize(self, row: EntityRow) -> RevokedToken:
		return RevokedToken(
			jti=row.get('jti'),
			userId=row.get('user_id'),
			tenantId=row.get('tenant_id'),
			expiresAt=row.get('expires_at'),
			revokedAt=row.get('revoked_at')
		)


REVOKED_TOKEN_ENTITY_NAME = 'revoked_tokens'
REVOKED_TOKEN_ENTITY_SHAPER = RevokedTokenShaper()


class RevokedTokenService(StorageService):
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
		return REVOKED_TOKEN_ENTITY_NAME

	# noinspection PyMethodMayBeStatic
	def get_entity_shaper(self) -> EntityShaper:
		return REVOKED_TOKEN_ENTITY_SHAPER

	# noinspection PyMethodMayBeStatic
	def get_entity_helper(self) -> EntityHelper:
		return EntityHelper(name=self.get_entity_name(), shaper=self.get_entity_shaper())

	def find_by_jti(self, jti: str) -> Optional[RevokedToken]:
		return self.storage.find_one(EntityFinder(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='jti'), right=jti)
			]
		))

	def is_revoked(self, jti: str) -> bool:
		return self.find_by_jti(jti) is not None

	def revoke(self, revoked: RevokedToken) -> RevokedToken:
		revoked.revokedAt = get_current_time_in_seconds()
		self.storage.insert_one(revoked, self.get_entity_helper())
		return revoked

	def delete_expired(self) -> None:
		"""
		remove rows whose token has already reached its own expiration, no value to keep them
		"""
		self.storage.delete(EntityDeleter(
			name=self.get_entity_name(),
			criteria=[
				EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName='expires_at'), operator=EntityCriteriaOperator.LESS_THAN,
					right=get_current_time_in_seconds())
			]
		))
