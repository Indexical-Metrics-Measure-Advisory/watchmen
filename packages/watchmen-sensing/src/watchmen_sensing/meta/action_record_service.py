from typing import List, Optional

from watchmen_meta.common import UserBasedTupleService, UserBasedTupleShaper
from watchmen_model.common import TenantId
from watchmen_storage import (
	ColumnNameLiteral, EntityCriteriaExpression, EntityShaper, EntityRow, EntitySortColumn, EntitySortMethod
)
from watchmen_utilities import is_not_blank

from watchmen_sensing.common.constants import ACTION_RECORD_ENTITY_NAME
from watchmen_sensing.model.autonomous import ActionRecord, ActionStatus


class ActionRecordShaper(UserBasedTupleShaper):
	def serialize(self, record: ActionRecord) -> EntityRow:
		row = {
			'action_id': record.actionId,
			'signal_id': record.signalId,
			'action_type': record.actionType,
			'autonomous_level': record.autonomousLevel,
			'risk_level': record.riskLevel,
			'execution_mode': record.executionMode,
			'status': record.status,
			'payload': record.payload,
			'result': record.result,
			'approved_by': record.approvedBy,
			'approved_at': record.approvedAt,
			'executed_at': record.executedAt,
		}
		# noinspection PyTypeChecker
		row = UserBasedTupleShaper.serialize(record, row)
		return row

	def deserialize(self, row: EntityRow) -> ActionRecord:
		record = ActionRecord(
			actionId=row.get('action_id'),
			signalId=row.get('signal_id'),
			actionType=row.get('action_type'),
			autonomousLevel=row.get('autonomous_level'),
			riskLevel=row.get('risk_level'),
			executionMode=row.get('execution_mode'),
			status=row.get('status'),
			payload=row.get('payload'),
			result=row.get('result'),
			approvedBy=row.get('approved_by'),
			approvedAt=row.get('approved_at'),
			executedAt=row.get('executed_at'),
		)
		# noinspection PyTypeChecker
		record: ActionRecord = UserBasedTupleShaper.deserialize(row, record)
		return record


ACTION_RECORD_ENTITY_SHAPER = ActionRecordShaper()


class ActionRecordService(UserBasedTupleService):
	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> str:
		return ACTION_RECORD_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return ACTION_RECORD_ENTITY_SHAPER

	def get_storable_id(self, storable: ActionRecord) -> str:
		return storable.actionId

	def set_storable_id(self, storable: ActionRecord, storable_id: str) -> ActionRecord:
		storable.actionId = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'action_id'

	def find_by_id(self, action_id: str, tenant_id: Optional[TenantId] = None) -> Optional[ActionRecord]:
		criteria = [
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='action_id'), right=action_id),
		]
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find_one(self.get_entity_finder(criteria=criteria))

	def find_pending(self, tenant_id: TenantId) -> List[ActionRecord]:
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=[
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id),
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='status'), right=ActionStatus.PROPOSED),
		], sort=[EntitySortColumn(name='last_modified_at', method=EntitySortMethod.DESC)]))

	def find_by_signal(self, signal_id: str, tenant_id: TenantId) -> List[ActionRecord]:
		criteria = [
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='signal_id'), right=signal_id),
		]
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(
			criteria=criteria, sort=[EntitySortColumn(name='last_modified_at', method=EntitySortMethod.DESC)]))
