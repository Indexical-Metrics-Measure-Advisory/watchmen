from datetime import datetime
from typing import Tuple

from watchmen_data_kernel.storage import TopicDataService
from watchmen_dqc.monitor.rule.types import RuleResult
from watchmen_model.dqc import MonitorRule


# noinspection PyUnusedLocal
def rows_no_change(
		data_service: TopicDataService, rule: MonitorRule,
		date_range: Tuple[datetime, datetime],
		changed_rows_count_in_range: int, total_rows_count: int
) -> RuleResult:
	if total_rows_count == 0:
		return RuleResult.SUCCESS
	rate = changed_rows_count_in_range / total_rows_count * 100
	return RuleResult.SUCCESS if rate <= rule.params.coverageRate else RuleResult.FAILED
