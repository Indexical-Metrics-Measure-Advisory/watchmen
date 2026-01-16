from watchmen_meta.common import UserBasedTupleService, UserBasedTupleShaper
from watchmen_model.alert import SuggestedAction
from watchmen_model.common import SuggestedActionId
from watchmen_storage import EntityRow, EntityShaper


class SuggestedActionShaper(UserBasedTupleShaper):
	def serialize(self, action: SuggestedAction) -> EntityRow:
		return {
			'suggested_action_id': action.suggestedActionId,
			'name': action.name,
			'type_id': action.typeId,
			'risk_level': action.riskLevel,
			'description': action.description,
			'expected_outcome': action.expectedOutcome,
			'conditions': action.conditions,
			'execution_mode': action.executionMode,
			'priority': action.priority,
			'enabled': action.enabled,
			'execution_count': action.executionCount,
			'success_rate': action.successRate,
			'last_executed': action.lastExecuted,
			'parameters': action.parameters,
			**super().serialize(action)
		}

	def deserialize(self, row: EntityRow) -> SuggestedAction:
		return SuggestedAction(
			suggestedActionId=row.get('suggested_action_id'),
			name=row.get('name'),
			typeId=row.get('type_id'),
			riskLevel=row.get('risk_level'),
			description=row.get('description'),
			expectedOutcome=row.get('expected_outcome'),
			conditions=row.get('conditions'),
			executionMode=row.get('execution_mode'),
			priority=row.get('priority'),
			enabled=row.get('enabled'),
			executionCount=row.get('execution_count'),
			successRate=row.get('success_rate'),
			lastExecuted=row.get('last_executed'),
			parameters=row.get('parameters'),
			**super().deserialize(row)
		)


class SuggestedActionService(UserBasedTupleService):
	def get_entity_name(self) -> str:
		return 'suggested_actions'

	def get_entity_shaper(self) -> EntityShaper:
		return SuggestedActionShaper()

	def get_storable_id(self, storable: SuggestedAction) -> SuggestedActionId:
		return storable.suggestedActionId

	def set_storable_id(self, storable: SuggestedAction, storable_id: SuggestedActionId) -> SuggestedAction:
		storable.suggestedActionId = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'suggested_action_id'
