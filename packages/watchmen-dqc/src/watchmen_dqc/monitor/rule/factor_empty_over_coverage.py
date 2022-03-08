from datetime import datetime
from typing import Tuple

from watchmen_data_kernel.storage import TopicDataService
from watchmen_model.dqc import MonitorRule
from watchmen_storage import EntityCriteriaExpression, EntityCriteriaOperator
from .data_service_utils import build_column_name_literal, find_factor
from .types import RuleResult


# noinspection PyUnusedLocal
def factor_empty_over_coverage(
		data_service: TopicDataService, rule: MonitorRule,
		date_range: Tuple[datetime, datetime],
		changed_rows_count_in_range: int, total_rows_count: int
) -> RuleResult:
	if total_rows_count == 0:
		return RuleResult.SUCCESS
	found, factor = find_factor(data_service, rule.factorId, rule)
	if not found:
		return RuleResult.IGNORED

	count = data_service.count_by_criteria([
		EntityCriteriaExpression(
			left=build_column_name_literal(factor, data_service),
			operator=EntityCriteriaOperator.IS_EMPTY
		)
	])
	rate = count / total_rows_count * 100
	return RuleResult.SUCCESS if rate > rule.params.coverageRate else RuleResult.FAILED
