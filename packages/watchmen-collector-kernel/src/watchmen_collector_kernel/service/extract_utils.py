from datetime import datetime
from logging import getLogger
from typing import Dict, Any, List
from watchmen_collector_kernel.model.collector_table_config import JoinKey
from watchmen_storage import EntityCriteriaExpression, ColumnNameLiteral, EntityCriteriaStatement, EntityCriteria, \
	EntityCriteriaOperator
from watchmen_utilities import ArrayHelper
from watchmen_collector_kernel.common import COMMA

logger = getLogger(__name__)


def build_criteria_by_primary_key(primary_key: List[str], values: List[str]) -> List[EntityCriteriaExpression]:
	if len(primary_key) != len(values):
		raise ValueError(
			f'The number of primary key fields {len(primary_key)} does not match the number of values {len(values)}'
		)
	else:
		def build_criteria(column_name: str, index_: int) -> EntityCriteriaExpression:
			return EntityCriteriaExpression(left=ColumnNameLiteral(columnName=column_name), right=values[index_])

		return ArrayHelper(primary_key).map_with_index(build_criteria).to_list()


def build_data_id(data_: Dict[str, Any], primary_key: List[str]) -> str:
	return ArrayHelper(primary_key).map(lambda column_name: data_.get(column_name)).join(COMMA)


def revert_data_id(data_id: str) -> List[str]:
	return data_id.split(COMMA)


def build_criteria_by_join_key(join_key: JoinKey, data: Dict, is_child: bool = False) -> EntityCriteriaStatement:
	if is_child:
		column_name = join_key.child_key
		column_value = data.get(join_key.parent_key)
	else:
		column_name = join_key.parentKey
		column_value = data.get(join_key.childKey)
	return EntityCriteriaExpression(left=ColumnNameLiteral(columnName=column_name), right=column_value)


def build_audit_criteria(audit_column_name: str, start_time: datetime, end_time: datetime) -> EntityCriteria:
	return [
		EntityCriteriaExpression(
			left=ColumnNameLiteral(columnName=audit_column_name),
			operator=EntityCriteriaOperator.GREATER_THAN_OR_EQUALS,
			right=start_time),
		EntityCriteriaExpression(
			left=ColumnNameLiteral(columnName=audit_column_name),
			operator=EntityCriteriaOperator.LESS_THAN_OR_EQUALS,
			right=end_time),
	]
