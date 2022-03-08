from datetime import datetime
from logging import getLogger
from typing import Any, List, Tuple

from watchmen_data_kernel.storage import TopicDataService
from watchmen_model.admin import Factor
from watchmen_model.dqc import MonitorRule
from watchmen_utilities import ArrayHelper
from .types import RuleResult

logger = getLogger(__name__)


# noinspection PyUnusedLocal
def factor_common_value_over_coverage(
		data_service: TopicDataService, factor: Factor,
		data: List[Tuple[Any, int]], rule: MonitorRule,
		date_range: Tuple[datetime, datetime],
		changed_rows_count_in_range: int, total_rows_count: int
) -> RuleResult:
	if changed_rows_count_in_range == 0:
		# no changes, success
		return RuleResult.SUCCESS

	mismatched = ArrayHelper(data) \
		.filter(lambda row: row[1] / changed_rows_count_in_range * 100 >= rule.params.aggregation) \
		.map(lambda row: row[1]) \
		.filter(lambda value: value != 0) \
		.some(lambda x: x / changed_rows_count_in_range * 100 > rule.params.coverageRate)

	return RuleResult.FAILED if mismatched else RuleResult.SUCCESS
