from datetime import datetime
from typing import Tuple

from watchmen_data_kernel.storage import TopicDataService
from watchmen_model.dqc import MonitorRule
from watchmen_storage import EntityCriteriaExpression, EntityCriteriaOperator
from .data_service_utils import build_column_name_literal
from .factor_value_assert import factor_value_assert
from .types import RuleResult


# noinspection PyUnusedLocal
def factor_is_empty(
		data_service: TopicDataService, rule: MonitorRule,
		date_range: Tuple[datetime, datetime],
		changed_rows_count_in_range: int, total_rows_count: int
) -> RuleResult:
	return factor_value_assert(
		data_service, rule, date_range, lambda factor: EntityCriteriaExpression(
			left=build_column_name_literal(factor, data_service),
			operator=EntityCriteriaOperator.IS_EMPTY
		)
	)
