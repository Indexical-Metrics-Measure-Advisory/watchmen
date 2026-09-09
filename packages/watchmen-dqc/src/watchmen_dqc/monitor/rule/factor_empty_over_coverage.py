from datetime import datetime
from typing import Tuple

from watchmen_data_kernel.storage import TopicDataService
from watchmen_model.dqc import MonitorRule
from watchmen_storage import EntityCriteriaExpression, EntityCriteriaOperator
from .data_service_utils import build_column_name_literal, build_date_range_criteria, find_factor
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

	# both numerator and denominator are computed within the statistical period,
	# to keep the coverage rate consistent
	rows_count_in_range = data_service.count_by_criteria(build_date_range_criteria(date_range))
	if rows_count_in_range == 0:
		# no data in given period, rule is not applicable
		return RuleResult.IGNORED
	criteria = build_date_range_criteria(date_range)
	criteria.append(EntityCriteriaExpression(
		left=build_column_name_literal(factor, data_service),
		operator=EntityCriteriaOperator.IS_EMPTY
	))
	count = data_service.count_by_criteria(criteria)
	rate = count / rows_count_in_range * 100
	# alarm when empty values ratio is over the coverage rate
	return RuleResult.FAILED if rate > rule.params.coverageRate else RuleResult.SUCCESS
