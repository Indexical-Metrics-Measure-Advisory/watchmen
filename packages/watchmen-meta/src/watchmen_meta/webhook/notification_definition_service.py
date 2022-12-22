from typing import List, Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import Storable, TenantId, Tuple, UserId
from watchmen_model.webhook.notification_defination import NotificationDefinition, NotificationParam
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaOperator, EntityName, EntityRow, \
	EntityShaper
from watchmen_utilities import ArrayHelper


class NotificationDefinitionShaper(EntityShaper):

	@staticmethod
	def serialize_param(param: NotificationParam):
		if isinstance(param, dict):
			return param
		else:
			return param.dict()

	@staticmethod
	def serialize_params(params: List[NotificationParam]):
		if params is None:
			return None
		return ArrayHelper(params).map(lambda x: NotificationDefinitionShaper.serialize_param(x)).to_list()

	def serialize(self, notification_definition: NotificationDefinition) -> EntityRow:
		return TupleShaper.serialize_tenant_based(notification_definition, {
			'notification_id': notification_definition.notificationId,
			'type': notification_definition.type,
			'params': NotificationDefinitionShaper.serialize_params(notification_definition.params),
			'user_id': notification_definition.userId
		})

	def deserialize(self, row: EntityRow) -> Tuple:
		return TupleShaper.deserialize_tenant_based(row, NotificationDefinition(
			notificationId=row.get('notification_id'),
			type=row.get('type'),
			params=row.get('params'),
			userId=row.get('user_id')
		))


NOTIFICATION_DEFINITION_ENTITY_NAME = 'notification_definitions'
NOTIFICATION_DEFINITION_ENTITY_SHAPER = NotificationDefinitionShaper()


class NotificationDefinitionService(TupleService):

	def should_record_operation(self) -> bool:
		return False

	def get_storable_id_column_name(self) -> EntityName:
		return "notification_id"

	def get_storable_id(self, storable: NotificationDefinition) -> StorableId:
		return storable.notificationId

	def set_storable_id(self, storable: NotificationDefinition, storable_id: StorableId) -> Storable:
		storable.notificationId = storable_id
		return storable

	def get_entity_name(self) -> str:
		return NOTIFICATION_DEFINITION_ENTITY_NAME

	# noinspection PyMethodMayBeStatic
	def get_entity_shaper(self) -> EntityShaper:
		return NOTIFICATION_DEFINITION_ENTITY_SHAPER

	def find_by_user_id(self, user_id: Optional[UserId], tenant_id: Optional[TenantId]) -> List[NotificationDefinition]:
		# always ignore super admin
		criteria = [
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='user_id'), operator=EntityCriteriaOperator.EQUALS,
				right=user_id)
		]

		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))
