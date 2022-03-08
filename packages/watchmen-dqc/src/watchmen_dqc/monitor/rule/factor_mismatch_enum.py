from datetime import datetime
from typing import Tuple

from watchmen_data_kernel.storage import TopicDataService
from watchmen_model.dqc import MonitorRule
from .data_service_utils import find_factor
from .types import RuleResult


def factor_mismatch_enum(
		data_service: TopicDataService, rule: MonitorRule,
		date_range: Tuple[datetime, datetime], changed_count_in_range: int
) -> RuleResult:
	found, factor = find_factor(data_service, rule.factorId, rule)
	if not found:
		return RuleResult.IGNORED
	# data_service.find_distinct_values()

	return RuleResult.FAILED
