from datetime import datetime
from logging import getLogger
from re import search
from typing import Any, Tuple

from watchmen_data_kernel.storage import TopicDataService
from watchmen_model.dqc import MonitorRule
from watchmen_utilities import ArrayHelper, is_blank
from .data_service_utils import build_date_range_criteria, find_factor
from .types import RuleResult

logger = getLogger(__name__)


def factor_use_regexp(
		data_service: TopicDataService, rule: MonitorRule,
		date_range: Tuple[datetime, datetime],
		should_match: bool
) -> RuleResult:
	found, factor = find_factor(data_service, rule.factorId, rule)
	if not found:
		return RuleResult.IGNORED
	pattern = rule.params.regexp
	if is_blank(pattern):
		logger.error(f'Regexp not declared on rule[{rule.dict()}].')
		return RuleResult.IGNORED

	rows = data_service.find_distinct_values(
		criteria=build_date_range_criteria(date_range),
		column_names=[data_service.get_data_entity_helper().get_column_name(factor.name)],
		distinct_value_on_single_column=True
	)

	def matched(value: Any) -> bool:
		if value is None:
			# ignore, it should be detected by factor_is_empty rule
			return False
		result = search(pattern, value)
		if result is not None:
			# regexp matched
			return should_match
		else:
			return not should_match

	mismatched = ArrayHelper(rows) \
		.map(lambda row: row.get(factor.name)) \
		.some(lambda x: matched(x))

	return RuleResult.FAILED if mismatched else RuleResult.SUCCESS
