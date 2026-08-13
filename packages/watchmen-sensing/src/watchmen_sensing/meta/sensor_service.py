from typing import List, Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.common import TenantId
from watchmen_storage import (
	ColumnNameLiteral, EntityCriteriaExpression, EntityShaper, EntityRow, EntitySortColumn, EntitySortMethod
)
from watchmen_utilities import is_not_blank

from watchmen_sensing.common.constants import SENSOR_ENTITY_NAME
from watchmen_sensing.model.sensor import Sensor, SensorStatus
from watchmen_sensing.model.signal import SignalCategory


class SensorShaper(EntityShaper):
	def serialize(self, sensor: Sensor) -> EntityRow:
		return TupleShaper.serialize_tenant_based(sensor, {
			'sensor_id': sensor.sensorId,
			'name': sensor.name,
			'category': sensor.category,
			'sensor_type': sensor.sensorType,
			'priority': sensor.priority,
			'enabled': sensor.enabled,
			'schedule': sensor.schedule,
			'config': sensor.config,
			'status': sensor.status,
		})

	def deserialize(self, row: EntityRow) -> Sensor:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, Sensor(
			sensorId=row.get('sensor_id'),
			name=row.get('name'),
			category=row.get('category'),
			sensorType=row.get('sensor_type'),
			priority=row.get('priority'),
			enabled=row.get('enabled'),
			schedule=row.get('schedule'),
			config=row.get('config'),
			status=row.get('status'),
		))


SENSOR_ENTITY_SHAPER = SensorShaper()


class SensorService(TupleService):
	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> str:
		return SENSOR_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return SENSOR_ENTITY_SHAPER

	def get_storable_id(self, storable: Sensor) -> str:
		return storable.sensorId

	def set_storable_id(self, storable: Sensor, storable_id: str) -> Sensor:
		storable.sensorId = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'sensor_id'

	def find_by_id(self, sensor_id: str) -> Optional[Sensor]:
		# noinspection PyTypeChecker
		return self.storage.find_one(self.get_entity_finder(criteria=[
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='sensor_id'), right=sensor_id),
		]))

	def find_by_tenant(self, tenant_id: TenantId) -> List[Sensor]:
		criteria = []
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(
			criteria=criteria, sort=[EntitySortColumn(name='name', method=EntitySortMethod.ASC)]
		))

	def find_enabled(self, tenant_id: TenantId) -> List[Sensor]:
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=[
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id),
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='enabled'), right=True),
		]))

	def find_by_category(self, category: SignalCategory, tenant_id: TenantId) -> List[Sensor]:
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=[
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id),
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='category'), right=category),
		]))

	def set_enabled(self, sensor_id: str, enabled: bool, tenant_id: TenantId) -> int:
		status = SensorStatus.ENABLED if enabled else SensorStatus.DISABLED
		return self.storage.update_only(self.get_entity_updater(
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='sensor_id'), right=sensor_id),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id),
			],
			update={'enabled': enabled, 'status': status}
		))
