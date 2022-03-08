from datetime import datetime
from logging import getLogger
from typing import Any, List, Tuple

from watchmen_data_kernel.storage import TopicDataService
from watchmen_model.admin import Factor
from watchmen_model.dqc import MonitorRule
from .factor_use_regexp import factor_use_regexp
from .types import RuleResult

logger = getLogger(__name__)


# noinspection PyUnusedLocal
def factor_mismatch_regexp(
		data_service: TopicDataService, factor: Factor,
		data: List[Tuple[Any, int]], rule: MonitorRule,
		date_range: Tuple[datetime, datetime],
		changed_rows_count_in_range: int, total_rows_count: int
) -> RuleResult:
	return factor_use_regexp(data_service, factor, data, rule, date_range, False)
