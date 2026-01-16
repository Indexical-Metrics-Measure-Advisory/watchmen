from typing import List, Optional

from watchmen_meta.common import UserBasedTupleService, UserBasedTupleShaper
from watchmen_model.alert import ActionType
from watchmen_model.common import ActionTypeId, TenantId
from watchmen_storage import EntityRow, EntityShaper, ColumnNameLiteral


class ActionTypeShaper(UserBasedTupleShaper):
	def serialize(self, action_type: ActionType) -> EntityRow:
		return {
			'action_type_id': action_type.actionTypeId,
			'name': action_type.name,
			'code': action_type.code,
			'description': action_type.description,
			'requires_approval': action_type.requiresApproval,
			'enabled': action_type.enabled,
			'category': action_type.category,
			'parameters': action_type.parameters,
			**super().serialize(action_type)
		}

	def deserialize(self, row: EntityRow) -> ActionType:
		return ActionType(
			actionTypeId=row.get('action_type_id'),
			name=row.get('name'),
			code=row.get('code'),
			description=row.get('description'),
			requiresApproval=row.get('requires_approval'),
			enabled=row.get('enabled'),
			category=row.get('category'),
			parameters=row.get('parameters'),
			**super().deserialize(row)
		)


class ActionTypeService(UserBasedTupleService):
	def get_entity_name(self) -> str:
		return 'action_types'

	def get_entity_shaper(self) -> EntityShaper:
		return ActionTypeShaper()

	def get_storable_id(self, storable: ActionType) -> ActionTypeId:
		return storable.actionTypeId

	def set_storable_id(self, storable: ActionType, storable_id: ActionTypeId) -> ActionType:
		storable.actionTypeId = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'action_type_id'
