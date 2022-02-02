from datetime import datetime

from watchmen_auth import PrincipalService
from watchmen_model.common import PatId
from watchmen_model.system import PersonalAccessToken
from watchmen_storage import EntityHelper, EntityIdHelper, EntityRow, EntityShaper, SnowflakeGenerator, \
	TransactionalStorageSPI


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
			'permissions': pat.permissions
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
			permissions=row.get('permissions')
		)


PAT_ENTITY_NAME = 'pats'
PAT_ENTITY_SHAPER = PatShaper()


class PatService:
	storage: TransactionalStorageSPI

	def __init__(
			self,
			storage: TransactionalStorageSPI, snowflake_generator: SnowflakeGenerator,
			principal_service: PrincipalService
	):
		self.storage = storage
		self.snowflake_generator = snowflake_generator
		self.principal_service = principal_service

	def begin_transaction(self):
		self.storage.begin()

	def commit_transaction(self):
		self.storage.commit_and_close()

	def rollback_transaction(self):
		self.storage.rollback_and_close()

	def close_transaction(self):
		self.storage.close()

	# noinspection PyMethodMayBeStatic
	def get_entity_name(self) -> str:
		return PAT_ENTITY_NAME

	# noinspection PyMethodMayBeStatic
	def get_entity_shaper(self) -> EntityShaper:
		return PAT_ENTITY_SHAPER

	def get_entity_helper(self) -> EntityHelper:
		return EntityHelper(name=self.get_entity_name(), shaper=self.get_entity_shaper())

	def generate_pat_id(self) -> PatId:
		return str(self.snowflake_generator.next_id())

	# noinspection PyMethodMayBeStatic
	def get_tuple_id_column_name(self) -> str:
		return 'pat_id'

	def get_entity_id_helper(self) -> EntityIdHelper:
		return EntityIdHelper(
			name=self.get_entity_name(), shaper=self.get_entity_shaper(), idColumnName=self.get_tuple_id_column_name())

	def create(self, a_pat: PersonalAccessToken) -> PersonalAccessToken:
		a_pat.patId = self.generate_pat_id()
		a_pat.createdAt = datetime.now().replace(tzinfo=None)

		self.storage.insert_one(a_pat, self.get_entity_helper())
		return a_pat
