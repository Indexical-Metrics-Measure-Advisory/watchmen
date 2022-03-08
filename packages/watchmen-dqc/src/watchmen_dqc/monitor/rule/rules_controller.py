# # structure
#
# # type
# FACTOR_MISMATCH_ENUM = 'factor-mismatch-enum',
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
from typing import List, Tuple

from watchmen_data_kernel.storage import TopicDataService
from watchmen_model.dqc import MonitorRule
from watchmen_utilities import ArrayHelper

RULES = [

]


def run_all_rules(
		data_service: TopicDataService, rules: List[MonitorRule],
		date_range: Tuple[datetime, datetime], changed_count_in_range: int) -> None:
	"""
	run all rules except disabled ones, rows_not_exists, rows_count_mismatch_and_another.
	make sure pass-in rules are in same frequency, will not check them inside.
	"""
	ArrayHelper(RULES).each(lambda x: x(data_service, rules, date_range, changed_count_in_range))
