# # for all factor types
# FACTOR_COMMON_VALUE_OVER_COVERAGE = 'factor-common-value-over-coverage',
# FACTOR_EMPTY_OVER_COVERAGE = 'factor-empty-over-coverage',
#
# # for number type
# FACTOR_MEDIAN_NOT_IN_RANGE = 'factor-median-not-in-range',
# FACTOR_QUANTILE_NOT_IN_RANGE = 'factor-quantile-not-in-range',
# FACTOR_STDEV_NOT_IN_RANGE = 'factor-stdev-not-in-range',
# FACTOR_COMMON_VALUE_NOT_IN_RANGE = 'factor-common-value-not-in-range',
#
# # for string type
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
from .factor_avg_not_in_range import factor_avg_not_in_range
from .factor_is_blank import factor_is_blank
from .factor_is_empty import factor_is_empty
from .factor_max_not_in_range import factor_max_not_in_range
from .factor_min_not_in_range import factor_min_not_in_range
from .factor_mismatch_enum import factor_mismatch_enum
from .factor_mismatch_type import factor_mismatch_type
from .factor_not_in_range import factor_not_in_range
from .factor_string_length_mismatch import factor_string_length_mismatch
from .factor_string_length_not_in_range import factor_string_length_not_in_range
from .rows_no_change import rows_no_change
from .trigger_pipeline import trigger
from .types import RuleHandler, RuleResult

rules_map: Dict[MonitorRuleCode, RuleHandler] = {
	MonitorRuleCode.FACTOR_MISMATCH_ENUM: factor_mismatch_enum,
	MonitorRuleCode.ROWS_NO_CHANGE: rows_no_change,
	MonitorRuleCode.FACTOR_MISMATCH_TYPE: factor_mismatch_type,
	MonitorRuleCode.FACTOR_IS_EMPTY: factor_is_empty,
	MonitorRuleCode.FACTOR_IS_BLANK: factor_is_blank,
	MonitorRuleCode.FACTOR_STRING_LENGTH_MISMATCH: factor_string_length_mismatch,
	MonitorRuleCode.FACTOR_STRING_LENGTH_NOT_IN_RANGE: factor_string_length_not_in_range,
	MonitorRuleCode.FACTOR_NOT_IN_RANGE: factor_not_in_range,
	MonitorRuleCode.FACTOR_MAX_NOT_IN_RANGE: factor_max_not_in_range,
	MonitorRuleCode.FACTOR_MIN_NOT_IN_RANGE: factor_min_not_in_range,
	MonitorRuleCode.FACTOR_AVG_NOT_IN_RANGE: factor_avg_not_in_range
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


def accept_result(result: Tuple[MonitorRule, RuleResult]) -> bool:
	return result[1] != RuleResult.IGNORED


def run_all_rules(
		data_service: TopicDataService, rules: List[MonitorRule],
		date_range: Tuple[datetime, datetime],
		changed_rows_count_in_range: int, total_rows_count: int) -> None:
	"""
	run all rules except disabled ones, rows_not_exists, rows_count_mismatch_and_another.
	make sure pass-in rules are in same frequency, will not check them inside.
	"""

	def run_rule(rule: MonitorRule) -> Tuple[MonitorRule, RuleResult]:
		result = rules_map[rule.code](data_service, rule, date_range, changed_rows_count_in_range, total_rows_count)
		return rule, result

	def trigger_pipeline(result: Tuple[MonitorRule, RuleResult]) -> None:
		trigger(result[0], result[1], date_range[0], data_service.get_principal_service())

	ArrayHelper(rules).filter(accept).map(run_rule).filter(accept_result).each(trigger_pipeline)
