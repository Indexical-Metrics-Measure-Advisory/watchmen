from typing import List, Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.common import TenantId, Pageable, DataPage
from watchmen_storage import EntityShaper, EntityRow, EntityCriteriaExpression, ColumnNameLiteral, EntityCriteriaJoint, \
    EntityCriteriaJointConjunction, EntityCriteriaOperator
from watchmen_utilities import ArrayHelper, is_not_blank

from ..model.suggest_action import ActionType, SuggestedAction, ActionTypeParameter, SuggestedActionCondition


class ActionTypeShaper(EntityShaper):
    @staticmethod
    def serialize_parameter(parameter: ActionTypeParameter) -> dict:
        if isinstance(parameter, dict):
            return parameter
        return parameter.model_dump()

    def serialize(self, entity: ActionType) -> EntityRow:
        return TupleShaper.serialize_tenant_based(entity, {
            'action_type_id': entity.id,
            'name': entity.name,
            'code': entity.code,
            'description': entity.description,
            'requires_approval': entity.requiresApproval,
            'enabled': entity.enabled,
            'category': entity.category,
            'parameters': ArrayHelper(entity.parameters).map(
                lambda x: self.serialize_parameter(x)).to_list() if entity.parameters else None
        })

    def deserialize(self, row: EntityRow) -> ActionType:
        return TupleShaper.deserialize_tenant_based(row, ActionType(
            id=row.get('action_type_id'),
            name=row.get('name'),
            code=row.get('code'),
            description=row.get('description'),
            requiresApproval=row.get('requires_approval'),
            enabled=row.get('enabled'),
            category=row.get('category'),
            parameters=row.get('parameters')
        ))


ACTION_TYPE_ENTITY_NAME = 'action_types'
ACTION_TYPE_SHAPER = ActionTypeShaper()


class ActionTypeService(TupleService):
    def should_record_operation(self) -> bool:
        return True

    def get_entity_name(self) -> str:
        return ACTION_TYPE_ENTITY_NAME

    def get_entity_shaper(self) -> EntityShaper:
        return ACTION_TYPE_SHAPER

    def get_storable_id(self, storable: ActionType) -> str:
        return storable.id

    def set_storable_id(self, storable: ActionType, storable_id: str) -> ActionType:
        storable.id = storable_id
        return storable

    def get_storable_id_column_name(self) -> str:
        return 'action_type_id'

    def find_all_by_tenant_id(self, tenant_id: TenantId) -> List[ActionType]:
        criteria = []
        if is_not_blank(tenant_id):
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria))

    def find_page_by_text(self, text: Optional[str], pageable: Pageable) -> DataPage:
        criteria = []
        if is_not_blank(text):
            criteria.append(EntityCriteriaJoint(
                conjunction=EntityCriteriaJointConjunction.OR,
                children=[
                    EntityCriteriaExpression(
                        left=ColumnNameLiteral(columnName='name'), operator=EntityCriteriaOperator.LIKE, right=text),
                    EntityCriteriaExpression(
                        left=ColumnNameLiteral(columnName='description'), operator=EntityCriteriaOperator.LIKE,
                        right=text)
                ]
            ))
        tenant_id = self.principalService.get_tenant_id()
        if is_not_blank(tenant_id):
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        return self.storage.page(self.get_entity_pager(criteria=criteria, pageable=pageable))

    def find_page_by_criteria(self, criteria: dict, pageable: Pageable) -> DataPage:
        # Basic implementation for now, assuming criteria is simple dictionary mapping to columns
        storage_criteria = []
        for key, value in criteria.items():
            if is_not_blank(value):
                storage_criteria.append(
                    EntityCriteriaExpression(left=ColumnNameLiteral(columnName=key), right=value))
        
        tenant_id = self.principalService.get_tenant_id()
        if is_not_blank(tenant_id):
            storage_criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        
        return self.storage.page(self.get_entity_pager(criteria=storage_criteria, pageable=pageable))


class SuggestedActionShaper(EntityShaper):
    @staticmethod
    def serialize_condition(condition: SuggestedActionCondition) -> dict:
        if isinstance(condition, dict):
            return condition
        return condition.model_dump()

    def serialize(self, entity: SuggestedAction) -> EntityRow:
        return TupleShaper.serialize_tenant_based(entity, {
            'suggested_action_id': entity.id,
            'name': entity.name,
            'type_id': entity.typeId,
            'risk_level': entity.riskLevel,
            'description': entity.description,
            'expected_outcome': entity.expectedOutcome,
            'conditions': ArrayHelper(entity.conditions).map(
                lambda x: self.serialize_condition(x)).to_list() if entity.conditions else None,
            'execution_mode': entity.executionMode,
            'priority': entity.priority,
            'enabled': entity.enabled,
            'execution_count': entity.executionCount,
            'success_rate': entity.successRate,
            'last_executed': entity.lastExecuted,
            'parameters': entity.parameters
        })

    def deserialize(self, row: EntityRow) -> SuggestedAction:
        return TupleShaper.deserialize_tenant_based(row, SuggestedAction(
            id=row.get('suggested_action_id'),
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
            parameters=row.get('parameters')
        ))


SUGGESTED_ACTION_ENTITY_NAME = 'suggested_actions'
SUGGESTED_ACTION_SHAPER = SuggestedActionShaper()


class SuggestedActionService(TupleService):
    def should_record_operation(self) -> bool:
        return True

    def get_entity_name(self) -> str:
        return SUGGESTED_ACTION_ENTITY_NAME

    def get_entity_shaper(self) -> EntityShaper:
        return SUGGESTED_ACTION_SHAPER

    def get_storable_id(self, storable: SuggestedAction) -> str:
        return storable.id

    def set_storable_id(self, storable: SuggestedAction, storable_id: str) -> SuggestedAction:
        storable.id = storable_id
        return storable

    def get_storable_id_column_name(self) -> str:
        return 'suggested_action_id'

    def find_all_by_tenant_id(self, tenant_id: TenantId) -> List[SuggestedAction]:
        criteria = []
        if is_not_blank(tenant_id):
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria))

    def find_page_by_text(self, text: Optional[str], pageable: Pageable) -> DataPage:
        criteria = []
        if is_not_blank(text):
            criteria.append(EntityCriteriaJoint(
                conjunction=EntityCriteriaJointConjunction.OR,
                children=[
                    EntityCriteriaExpression(
                        left=ColumnNameLiteral(columnName='name'), operator=EntityCriteriaOperator.LIKE, right=text),
                    EntityCriteriaExpression(
                        left=ColumnNameLiteral(columnName='description'), operator=EntityCriteriaOperator.LIKE,
                        right=text)
                ]
            ))
        tenant_id = self.principalService.get_tenant_id()
        if is_not_blank(tenant_id):
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        return self.storage.page(self.get_entity_pager(criteria=criteria, pageable=pageable))

    def find_page_by_criteria(self, criteria: dict, pageable: Pageable) -> DataPage:
        storage_criteria = []
        for key, value in criteria.items():
            if is_not_blank(value):
                storage_criteria.append(
                    EntityCriteriaExpression(left=ColumnNameLiteral(columnName=key), right=value))

        tenant_id = self.principalService.get_tenant_id()
        if is_not_blank(tenant_id):
            storage_criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))

        return self.storage.page(self.get_entity_pager(criteria=storage_criteria, pageable=pageable))
