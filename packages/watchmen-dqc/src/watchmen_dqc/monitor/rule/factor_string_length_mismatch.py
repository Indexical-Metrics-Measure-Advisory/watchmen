from datetime import datetime
from typing import Tuple

from watchmen_data_kernel.storage import TopicDataService
from watchmen_model.dqc import MonitorRule
from watchmen_storage import ComputedLiteral, ComputedLiteralOperator, EntityCriteriaExpression, EntityCriteriaOperator
from .data_service_utils import build_column_name_literal, build_date_range_criteria, find_factor
from .types import RuleResult


# noinspection PyUnusedLocal
def factor_string_length_mismatch(
		data_service: TopicDataService, rule: MonitorRule,
		date_range: Tuple[datetime, datetime],
		changed_rows_count_in_range: int, total_rows_count: int
) -> RuleResult:
	found, factor = find_factor(data_service, rule.factorId, rule)
	if not found:
		return RuleResult.IGNORED

	count = data_service.count_by_criteria([
		EntityCriteriaExpression(
			left=ComputedLiteral(
				operator=ComputedLiteralOperator.CHAR_LENGTH,
				elements=[build_column_name_literal(factor, data_service)]
			),
			operator=EntityCriteriaOperator.NOT_EQUALS,
			right=rule.params.length
		),
		*build_date_range_criteria(date_range)
	])

	return RuleResult.SUCCESS if count == 0 else RuleResult.FAILED
