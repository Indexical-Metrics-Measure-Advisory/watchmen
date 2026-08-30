from typing import List, Optional

from watchmen_model.common import TenantId, Tuple
from watchmen_model.system import PublishNotificationResource, PublishNotificationSetting
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityName, EntityRow, EntityShaper

from .storage_service import StorableId
from .tuple_service import TupleService, TupleShaper


class PublishNotificationSettingShaper(EntityShaper):

	@staticmethod
	def serialize_resources(resources: Optional[List[PublishNotificationResource]]) -> Optional[List[str]]:
		if resources is None:
			return None
		return [resource.value if isinstance(resource, PublishNotificationResource) else resource for resource in resources]

	def serialize(self, setting: PublishNotificationSetting) -> EntityRow:
		return TupleShaper.serialize_tenant_based(setting, {
			'setting_id': setting.settingId,
			'enabled': setting.enabled,
			'resources': PublishNotificationSettingShaper.serialize_resources(setting.resources),
			'type': setting.type,
			'url': setting.url,
			'secret': setting.secret
		})

	def deserialize(self, row: EntityRow) -> Tuple:
		return TupleShaper.deserialize_tenant_based(row, PublishNotificationSetting(
			settingId=row.get('setting_id'),
			enabled=row.get('enabled'),
			resources=row.get('resources'),
			type=row.get('type'),
			url=row.get('url'),
			secret=row.get('secret')
		))


PUBLISH_NOTIFICATION_SETTING_ENTITY_NAME = 'publish_notification_setting'
PUBLISH_NOTIFICATION_SETTING_ENTITY_SHAPER = PublishNotificationSettingShaper()


class PublishNotificationService(TupleService):

	def should_record_operation(self) -> bool:
		return False

	def get_storable_id_column_name(self) -> EntityName:
		return 'setting_id'

	def get_storable_id(self, storable: PublishNotificationSetting) -> StorableId:
		return storable.settingId

	def set_storable_id(self, storable: PublishNotificationSetting, storable_id: StorableId) -> PublishNotificationSetting:
		storable.settingId = storable_id
		return storable

	def get_entity_name(self) -> EntityName:
		return PUBLISH_NOTIFICATION_SETTING_ENTITY_NAME

	# noinspection PyMethodMayBeStatic
	def get_entity_shaper(self) -> EntityShaper:
		return PUBLISH_NOTIFICATION_SETTING_ENTITY_SHAPER

	def find_by_tenant(self, tenant_id: Optional[TenantId]) -> Optional[PublishNotificationSetting]:
		criteria = [
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id)
		]
		# noinspection PyTypeChecker
		return self.storage.find_one(self.get_entity_finder(criteria=criteria))
