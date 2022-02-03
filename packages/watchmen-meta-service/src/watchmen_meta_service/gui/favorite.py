from typing import Optional

from watchmen_auth import PrincipalService
from watchmen_model.common import TenantId, UserId
from watchmen_model.gui import Favorite
from watchmen_storage import EntityCriteriaExpression, EntityFinder, EntityHelper, EntityIdHelper, EntityRow, \
	EntityShaper, EntityUpdater, TransactionalStorageSPI


class FavoriteShaper(EntityShaper):
	def serialize(self, favorite: Favorite) -> EntityRow:
		return {
			'connected_space_ids': favorite.connectedSpaceIds,
			'dashboard_ids': favorite.dashboardIds,
			'tenant_id': favorite.tenantId,
			'user_id': favorite.userId
		}

	def deserialize(self, row: EntityRow) -> Favorite:
		return Favorite(
			connectedSpaceIds=row.get('connected_space_ids'),
			dashboardIds=row.get('dashboard_ids'),
			tenantId=row.get('tenant_id'),
			userId=row.get('user_id')
		)


FAVORITE_ENTITY_NAME = 'favorites'
FAVORITE_ENTITY_SHAPER = FavoriteShaper()


class FavoriteService:
	storage: TransactionalStorageSPI

	def __init__(self, storage: TransactionalStorageSPI, principal_service: PrincipalService):
		self.storage = storage
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
		return FAVORITE_ENTITY_NAME

	# noinspection PyMethodMayBeStatic
	def get_entity_shaper(self) -> EntityShaper:
		return FAVORITE_ENTITY_SHAPER

	def get_entity_helper(self) -> EntityHelper:
		return EntityHelper(name=self.get_entity_name(), shaper=self.get_entity_shaper())

	# noinspection PyMethodMayBeStatic
	def get_pat_id_column_name(self) -> str:
		return 'user_id'

	def get_entity_id_helper(self) -> EntityIdHelper:
		return EntityIdHelper(
			name=self.get_entity_name(), shaper=self.get_entity_shaper(), idColumnName=self.get_pat_id_column_name())

	def create(self, favorite: Favorite) -> None:
		return self.storage.insert_one(favorite, self.get_entity_helper())

	def update(self, favorite: Favorite) -> None:
		self.storage.update_only(EntityUpdater(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=[
				EntityCriteriaExpression(name='user_id', value=favorite.userId),
				EntityCriteriaExpression(name='tenant_id', value=favorite.tenantId)
			],
			update={'connected_space_ids': favorite.connectedSpaceIds, 'dashboardIds': favorite.dashboardIds}
		))

	def find_by_id(self, user_id: UserId, tenant_id: TenantId) -> Optional[Favorite]:
		return self.storage.find_one(EntityFinder(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=[
				EntityCriteriaExpression(name='user_id', value=user_id),
				EntityCriteriaExpression(name='tenant_id', value=tenant_id)
			]
		))
