from typing import Optional

from watchmen_auth import PrincipalService
from watchmen_meta.common import LastVisitShaper, StorageService, UserBasedTupleShaper
from watchmen_model.common import TenantId, UserId
from watchmen_model.gui import LastSnapshot
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityFinder, EntityHelper, EntityIdHelper, \
	EntityRow, EntityShaper, EntityUpdater, TransactionalStorageSPI


class LastSnapshotShaper(EntityShaper):
	def serialize(self, last_snapshot: LastSnapshot) -> EntityRow:
		row = {
			'language': last_snapshot.language,
			'last_dashboard_id': last_snapshot.lastDashboardId,
			'admin_dashboard_id': last_snapshot.adminDashboardId,
			'favorite_pin': last_snapshot.favoritePin
		}
		row = UserBasedTupleShaper.serialize(last_snapshot, row)
		row = LastVisitShaper.serialize(last_snapshot, row)
		return row

	def deserialize(self, row: EntityRow) -> LastSnapshot:
		last_snapshot = LastSnapshot(
			language=row.get('language'),
			lastDashboardId=row.get('last_dashboard_id'),
			adminDashboardId=row.get('admin_dashboard_id'),
			favoritePin=row.get('favorite_pin')
		)
		# noinspection PyTypeChecker
		last_snapshot: LastSnapshot = UserBasedTupleShaper.deserialize(row, last_snapshot)
		# noinspection PyTypeChecker
		last_snapshot: LastSnapshot = LastVisitShaper.deserialize(row, last_snapshot)
		return last_snapshot


LAST_SNAPSHOT_ENTITY_NAME = 'last_snapshots'
LAST_SNAPSHOT_ENTITY_SHAPER = LastSnapshotShaper()


class LastSnapshotService(StorageService):
	def __init__(self, storage: TransactionalStorageSPI, principal_service: PrincipalService):
		super().__init__(storage)
		self.with_principal_service(principal_service)

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

	def create(self, last_snapshot: LastSnapshot) -> LastSnapshot:
		self.storage.insert_one(last_snapshot, self.get_entity_helper())
		return last_snapshot

	def update(self, last_snapshot: LastSnapshot) -> LastSnapshot:
		self.storage.update_only(EntityUpdater(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='user_id'), right=last_snapshot.userId),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=last_snapshot.tenantId)
			],
			update={
				'language': last_snapshot.language,
				'last_dashboard_id': last_snapshot.lastDashboardId,
				'admin_dashboard_id': last_snapshot.adminDashboardId,
				'favorite_pin': last_snapshot.favoritePin,
				'last_visit_time': last_snapshot.lastVisitTime
			}
		))
		return last_snapshot

	def find_by_user_id(self, user_id: UserId, tenant_id: TenantId) -> Optional[LastSnapshot]:
		return self.storage.find_one(EntityFinder(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='user_id'), right=user_id),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id)
			]
		))

	def delete_by_id(self, user_id: UserId) -> Optional[LastSnapshot]:
		return self.storage.delete_by_id_and_pull(user_id, self.get_entity_id_helper())
