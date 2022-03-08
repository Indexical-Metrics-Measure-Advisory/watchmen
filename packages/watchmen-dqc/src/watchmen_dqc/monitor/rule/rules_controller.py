# FACTOR_MISMATCH_TYPE = 'factor-mismatch-type',
#
# # topic row count
# ROWS_NO_CHANGE = 'rows-no-change',
#
# # for all factor types
# FACTOR_IS_EMPTY = 'factor-is-empty',
# FACTOR_COMMON_VALUE_OVER_COVERAGE = 'factor-common-value-over-coverage',
# FACTOR_EMPTY_OVER_COVERAGE = 'factor-empty-over-coverage',
#
# # for number type
# FACTOR_NOT_IN_RANGE = 'factor-not-in-range',
# FACTOR_MAX_NOT_IN_RANGE = 'factor-max-not-in-range',
# FACTOR_MIN_NOT_IN_RANGE = 'factor-min-not-in-range',
# FACTOR_AVG_NOT_IN_RANGE = 'factor-avg-not-in-range',
# FACTOR_MEDIAN_NOT_IN_RANGE = 'factor-median-not-in-range',
# FACTOR_QUANTILE_NOT_IN_RANGE = 'factor-quantile-not-in-range',
# FACTOR_STDEV_NOT_IN_RANGE = 'factor-stdev-not-in-range',
# FACTOR_COMMON_VALUE_NOT_IN_RANGE = 'factor-common-value-not-in-range',
#
# # for string type
# FACTOR_IS_BLANK = 'factor-is-blank',
# FACTOR_STRING_LENGTH_MISMATCH = 'factor-string-length-mismatch',
# FACTOR_STRING_LENGTH_NOT_IN_RANGE = 'factor-string-length-not-in-range',
# FACTOR_MATCH_REGEXP = 'factor-match-regexp',
# FACTOR_MISMATCH_REGEXP = 'factor-mismatch-regexp',
#
# # for 2 factors
# FACTOR_AND_ANOTHER = 'factor-and-another'
from datetime import datetime
from typing import Dict, List, Tuple

from watchmen_data_kernel.storage import TopicDataService
from watchmen_model.dqc import MonitorRule, MonitorRuleCode
from watchmen_utilities import ArrayHelper
from .disabled_rules import disabled_rules
from .factor_mismatch_enum import factor_mismatch_enum
from .trigger_pipeline import trigger
from .types import RuleHandler, RuleResult

rules_map: Dict[MonitorRuleCode, RuleHandler] = {
	MonitorRuleCode.FACTOR_MISMATCH_ENUM: factor_mismatch_enum
}


def accept(rule: MonitorRule) -> bool:
	rule_code = rule.code
	if rule_code in disabled_rules:
		return False
	elif rule_code == MonitorRuleCode.ROWS_NOT_EXISTS:
		return False
	elif rule_code == MonitorRuleCode.ROWS_COUNT_MISMATCH_AND_ANOTHER:
		return False
	return True


def run_all_rules(
		data_service: TopicDataService, rules: List[MonitorRule],
		date_range: Tuple[datetime, datetime], changed_count_in_range: int) -> None:
	"""
	run all rules except disabled ones, rows_not_exists, rows_count_mismatch_and_another.
	make sure pass-in rules are in same frequency, will not check them inside.
	"""
	ArrayHelper(rules) \
		.map(lambda x: (x, rules_map[x.code](data_service, x, date_range, changed_count_in_range))) \
		.filter(lambda x: x[1] != RuleResult.IGNORED) \
		.each(lambda x: trigger(x[0], x[1] == RuleResult.SUCCESS, date_range[0], data_service.get_principal_service()))
