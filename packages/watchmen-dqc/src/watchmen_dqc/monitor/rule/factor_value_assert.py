from datetime import datetime
from typing import Callable, Tuple

from watchmen_data_kernel.storage import TopicDataService
from watchmen_model.admin import Factor
from watchmen_model.dqc import MonitorRule
from watchmen_storage import EntityCriteriaExpression
from .data_service_utils import build_date_range_criteria, find_factor
from .types import RuleResult


def factor_value_assert(
		data_service: TopicDataService, rule: MonitorRule,
		date_range: Tuple[datetime, datetime],
		assert_expression: Callable[[Factor], EntityCriteriaExpression]
) -> RuleResult:
	found, factor = find_factor(data_service, rule.factorId, rule)
	if not found:
		return RuleResult.IGNORED

	count = data_service.count_by_criteria([
		assert_expression(factor),
		*build_date_range_criteria(date_range)
	])

	return RuleResult.SUCCESS if count == 0 else RuleResult.FAILED
