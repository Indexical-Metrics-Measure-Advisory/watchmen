from enum import Enum
from typing import Any, Optional

from watchmen_meta.common import TupleService
from watchmen_model.common import TenantId
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression
from watchmen_utilities import is_not_blank


class TaskHubTupleService(TupleService):
	def should_record_operation(self) -> bool:
		return False

	def get_operation_tuple_type(self) -> str:
		return self.get_entity_name()


def value_of(value: Any) -> Any:
	return value.value if isinstance(value, Enum) else value


def tenant_criteria(tenant_id: Optional[TenantId]) -> list:
	if is_not_blank(tenant_id):
		return [EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id)]
	return []
