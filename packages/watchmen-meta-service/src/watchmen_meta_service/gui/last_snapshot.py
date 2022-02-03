from typing import Optional

from watchmen_auth import PrincipalService
from watchmen_model.common import TenantId, UserId
from watchmen_model.gui import LastSnapshot
from watchmen_storage import EntityCriteriaExpression, EntityFinder, EntityHelper, EntityIdHelper, EntityRow, \
	EntityShaper, EntityUpdater, TransactionalStorageSPI


class LastSnapshotShaper(EntityShaper):
	def serialize(self, last_snapshot: LastSnapshot) -> EntityRow:
		return {
			'language': last_snapshot.language,
			'last_dashboard_id': last_snapshot.lastDashboardId,
			'admin_dashboard_id': last_snapshot.adminDashboardId,
			'favorite_pin': last_snapshot.favoritePin,
			'tenant_id': last_snapshot.tenantId,
			'user_id': last_snapshot.userId,
			'last_visit_time': last_snapshot.lastVisitTime
		}

	def deserialize(self, row: EntityRow) -> LastSnapshot:
		return LastSnapshot(
			language=row.get('language'),
			lastDashboardId=row.get('last_dashboard_id'),
			adminDashboardId=row.get('admin_dashboard_id'),
			favoritePin=row.get('favorite_pin'),
			tenantId=row.get('tenant_id'),
			userId=row.get('user_id'),
			lastVisitTime=row.get('last_visit_time')
		)


LAST_SNAPSHOT_ENTITY_NAME = 'last_snapshots'
LAST_SNAPSHOT_ENTITY_SHAPER = LastSnapshotShaper()


class LastSnapshotService:
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
		return LAST_SNAPSHOT_ENTITY_NAME

	# noinspection PyMethodMayBeStatic
	def get_entity_shaper(self) -> EntityShaper:
		return LAST_SNAPSHOT_ENTITY_SHAPER

	def get_entity_helper(self) -> EntityHelper:
		return EntityHelper(name=self.get_entity_name(), shaper=self.get_entity_shaper())

	def get_entity_id_helper(self) -> EntityIdHelper:
		return EntityIdHelper(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			idColumnName='user_id'
		)

	def create(self, last_snapshot: LastSnapshot) -> None:
		return self.storage.insert_one(last_snapshot, self.get_entity_helper())

	def update(self, last_snapshot: LastSnapshot) -> None:
		self.storage.update_only(EntityUpdater(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=[
				EntityCriteriaExpression(name='user_id', value=last_snapshot.userId),
				EntityCriteriaExpression(name='tenant_id', value=last_snapshot.tenantId)
			],
			update={'connected_space_ids': last_snapshot.connectedSpaceIds, 'dashboardIds': last_snapshot.dashboardIds}
		))

	def find_by_id(self, user_id: UserId, tenant_id: TenantId) -> Optional[LastSnapshot]:
		return self.storage.find_one(EntityFinder(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=[
				EntityCriteriaExpression(name='user_id', value=user_id),
				EntityCriteriaExpression(name='tenant_id', value=tenant_id)
			]
		))

	def delete_by_id(self, user_id: UserId) -> Optional[LastSnapshot]:
		return self.storage.delete_by_id_and_pull(user_id, self.get_entity_id_helper())
