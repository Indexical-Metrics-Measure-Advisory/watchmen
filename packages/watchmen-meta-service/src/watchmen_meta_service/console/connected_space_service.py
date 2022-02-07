from datetime import datetime
from typing import List, Optional

from watchmen_meta_service.common import AuditableShaper, LastVisitShaper, TupleNotFoundException, \
	UserBasedTupleService, UserBasedTupleShaper
from watchmen_model.common import ConnectedSpaceId, SpaceId, TenantId, UserId
from watchmen_model.console import ConnectedSpace
from watchmen_storage import EntityCriteriaExpression, EntityCriteriaOperator, EntityRow, EntityShaper, \
	TooManyEntitiesFoundException


class ConnectedSpaceShaper(EntityShaper):
	def serialize(self, connected_space: ConnectedSpace) -> EntityRow:
		row = {
			'connect_id': connected_space.connectId,
			'space_id': connected_space.spaceId,
			'name': connected_space.name,
			'is_template': connected_space.isTemplate
		}
		row = AuditableShaper.serialize(connected_space, row)
		row = UserBasedTupleShaper.serialize(connected_space, row)
		row = LastVisitShaper.serialize(connected_space, row)
		return row

	def deserialize(self, row: EntityRow) -> ConnectedSpace:
		connected_space = ConnectedSpace(
			connectId=row.get('connect_id'),
			spaceId=row.get('space_id'),
			name=row.get('name'),
			isTemplate=row.get('is_template')
		)
		# noinspection PyTypeChecker
		connected_space: ConnectedSpace = AuditableShaper.deserialize(row, connected_space)
		# noinspection PyTypeChecker
		connected_space: ConnectedSpace = UserBasedTupleShaper.deserialize(row, connected_space)
		# noinspection PyTypeChecker
		connected_space: ConnectedSpace = LastVisitShaper.deserialize(row, connected_space)
		return connected_space


CONNECTED_SPACE_ENTITY_NAME = 'connected_spaces'
CONNECTED_SPACE_ENTITY_SHAPER = ConnectedSpaceShaper()


class ConnectedSpaceService(UserBasedTupleService):
	def get_entity_name(self) -> str:
		return CONNECTED_SPACE_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return CONNECTED_SPACE_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> str:
		return 'connect_id'

	def get_storable_id(self, storable: ConnectedSpace) -> ConnectedSpaceId:
		return storable.connectId

	def set_storable_id(self, storable: ConnectedSpace, storable_id: ConnectedSpaceId) -> ConnectedSpace:
		storable.connectId = storable_id
		return storable

	# noinspection DuplicatedCode
	def find_tenant_id(self, connect_id: ConnectedSpaceId) -> Optional[TenantId]:
		finder = self.get_entity_finder_for_columns(
			criteria=[
				EntityCriteriaExpression(name=self.get_storable_id_column_name(), value=connect_id),
			],
			distinctColumnNames=['tenant_id']
		)
		rows = self.storage.find_distinct_values(finder)
		count = len(rows)
		if count == 0:
			return None
		elif count == 1:
			return rows[0].get('tenant_id')
		else:
			raise TooManyEntitiesFoundException(f'Too many entities found by finder[{finder}].')

	def find_templates_by_ids(
			self, connect_ids: List[ConnectedSpaceId], space_id: Optional[SpaceId], tenant_id: TenantId
	) -> List[ConnectedSpace]:
		criteria = [
			EntityCriteriaExpression(
				name=self.get_storable_id_column_name(), operator=EntityCriteriaOperator.IN, value=connect_ids),
			EntityCriteriaExpression(name='is_template', value=True),
			EntityCriteriaExpression(name='tenant_id', value=tenant_id)
		]
		if space_id is not None and len(space_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(name='space_id', value=space_id))

		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))

	def find_templates_by_space_id(self, space_id: SpaceId, tenant_id: TenantId) -> List[ConnectedSpace]:
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(
			criteria=[
				EntityCriteriaExpression(name='space_id', value=space_id),
				EntityCriteriaExpression(name='tenant_id', value=tenant_id),
				EntityCriteriaExpression(name='is_template', value=True),
			]
		))

	def find_templates_by_tenant_id(self, tenant_id: TenantId) -> List[ConnectedSpace]:
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(
			criteria=[
				EntityCriteriaExpression(name='tenant_id', value=tenant_id),
				EntityCriteriaExpression(name='is_template', value=True),
			]
		))

	# noinspection DuplicatedCode
	def update_name(self, connect_id: ConnectedSpaceId, name: str, user_id: UserId, tenant_id: TenantId) -> datetime:
		"""
		update name will not increase optimistic lock version
		"""
		last_modified_at = self.now()
		last_modified_by = self.principal_service.get_user_id()
		updated_count = self.storage.update_only(self.get_entity_updater(
			criteria=[
				EntityCriteriaExpression(name=self.get_storable_id_column_name(), value=connect_id),
				EntityCriteriaExpression(name='user_id', value=user_id),
				EntityCriteriaExpression(name='tenant_id', value=tenant_id)
			],
			update={
				'name': name,
				'last_modified_at': last_modified_at,
				'last_modified_by': last_modified_by
			}
		))
		if updated_count == 0:
			raise TupleNotFoundException('Update 0 row might be caused by tuple not found.')
		return last_modified_at

	def update_last_visit_time(self, connect_id: ConnectedSpaceId) -> datetime:
		now = self.now()
		self.storage.update(self.get_entity_updater(
			criteria=[EntityCriteriaExpression(name=self.get_storable_id_column_name(), value=connect_id)],
			update={'last_visit_time': now}
		))
		return now
