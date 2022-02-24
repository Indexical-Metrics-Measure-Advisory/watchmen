from typing import Optional

from watchmen_auth import PrincipalService
from watchmen_meta.common import LastVisitShaper, StorageService, UserBasedTupleShaper
from watchmen_model.common import TenantId, UserId
from watchmen_model.gui import Favorite
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityFinder, EntityHelper, EntityIdHelper, \
	EntityRow, EntityShaper, EntityUpdater, TransactionalStorageSPI


class FavoriteShaper(EntityShaper):
	def serialize(self, favorite: Favorite) -> EntityRow:
		row = {
			'connected_space_ids': favorite.connectedSpaceIds,
			'dashboard_ids': favorite.dashboardIds
		}
		row = UserBasedTupleShaper.serialize(favorite, row)
		row = LastVisitShaper.serialize(favorite, row)
		return row

	def deserialize(self, row: EntityRow) -> Favorite:
		favorite = Favorite(
			connectedSpaceIds=row.get('connected_space_ids'),
			dashboardIds=row.get('dashboard_ids')
		)
		# noinspection PyTypeChecker
		favorite: Favorite = UserBasedTupleShaper.deserialize(row, favorite)
		# noinspection PyTypeChecker
		favorite: Favorite = LastVisitShaper.deserialize(row, favorite)
		return favorite


FAVORITE_ENTITY_NAME = 'favorites'
FAVORITE_ENTITY_SHAPER = FavoriteShaper()


class FavoriteService(StorageService):
	def __init__(self, storage: TransactionalStorageSPI, principal_service: PrincipalService):
		super().__init__(storage)
		self.with_principal_service(principal_service)

	# noinspection PyMethodMayBeStatic
	def get_entity_name(self) -> str:
		return FAVORITE_ENTITY_NAME

	# noinspection PyMethodMayBeStatic
	def get_entity_shaper(self) -> EntityShaper:
		return FAVORITE_ENTITY_SHAPER

	def get_entity_helper(self) -> EntityHelper:
		return EntityHelper(name=self.get_entity_name(), shaper=self.get_entity_shaper())

	def get_entity_id_helper(self) -> EntityIdHelper:
		return EntityIdHelper(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			idColumnName='user_id'
		)

	def create(self, favorite: Favorite) -> Favorite:
		self.storage.insert_one(favorite, self.get_entity_helper())
		return favorite

	def update(self, favorite: Favorite) -> Favorite:
		self.storage.update_only(EntityUpdater(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='user_id'), right=favorite.userId),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=favorite.tenantId)
			],
			update={
				'connected_space_ids': favorite.connectedSpaceIds,
				'dashboard_ids': favorite.dashboardIds,
				'last_visit_time': favorite.lastVisitTime
			}
		))
		return favorite

	def find_by_user_id(self, user_id: UserId, tenant_id: TenantId) -> Optional[Favorite]:
		return self.storage.find_one(EntityFinder(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='user_id'), right=user_id),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id)
			]
		))

	def delete_by_id(self, user_id: UserId) -> Optional[Favorite]:
		return self.storage.delete_by_id_and_pull(user_id, self.get_entity_id_helper())
