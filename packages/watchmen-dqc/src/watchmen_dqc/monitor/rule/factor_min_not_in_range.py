from datetime import datetime
from typing import Tuple

from watchmen_data_kernel.storage import TopicDataService
from watchmen_model.dqc import MonitorRule
from watchmen_storage import EntityColumnAggregateArithmetic
from .factor_aggregate_value_not_in_range import factor_aggregate_value_not_in_range
from .types import RuleResult


# noinspection PyUnusedLocal
def factor_min_not_in_range(
		data_service: TopicDataService, rule: MonitorRule,
		date_range: Tuple[datetime, datetime],
		changed_rows_count_in_range: int, total_rows_count: int
) -> RuleResult:
	return factor_aggregate_value_not_in_range(data_service, rule, date_range, EntityColumnAggregateArithmetic.MIN)
