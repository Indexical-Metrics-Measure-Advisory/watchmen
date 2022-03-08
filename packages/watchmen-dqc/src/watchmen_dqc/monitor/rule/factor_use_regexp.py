from datetime import datetime
from logging import getLogger
from re import search
from typing import Any, List, Tuple

from watchmen_data_kernel.storage import TopicDataService
from watchmen_model.admin import Factor
from watchmen_model.dqc import MonitorRule
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank
from .types import RuleResult

logger = getLogger(__name__)


# noinspection PyUnusedLocal
def factor_use_regexp(
		data_service: TopicDataService, factor: Factor,
		data: List[Tuple[Any, int]], rule: MonitorRule,
		date_range: Tuple[datetime, datetime],
		should_match: bool
) -> RuleResult:
	pattern = rule.params.regexp
	if is_blank(pattern):
		logger.error(f'Regexp not declared on rule[{rule.dict()}].')
		return RuleResult.IGNORED

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

	mismatched = ArrayHelper(data) \
		.map(lambda row: row[0]) \
		.filter(lambda value: is_not_blank(value)) \
		.some(lambda x: matched(x))

	return RuleResult.FAILED if mismatched else RuleResult.SUCCESS
