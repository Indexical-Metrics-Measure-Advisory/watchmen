from datetime import datetime
from typing import Any, Dict, List, Tuple

from watchmen_data_kernel.storage import TopicDataService
from watchmen_model.dqc import MonitorRule, MonitorRuleCode
from watchmen_utilities import ArrayHelper
from watchmen_dqc.monitor.rule.disabled_rules import disabled_rules
from watchmen_dqc.monitor.rule.factor_and_another import factor_and_another
from watchmen_dqc.monitor.rule.factor_avg_not_in_range import factor_avg_not_in_range
from watchmen_dqc.monitor.rule.factor_empty_over_coverage import factor_empty_over_coverage
from watchmen_dqc.monitor.rule.factor_is_blank import factor_is_blank
from watchmen_dqc.monitor.rule.factor_is_empty import factor_is_empty
from watchmen_dqc.monitor.rule.factor_max_not_in_range import factor_max_not_in_range
from watchmen_dqc.monitor.rule.factor_min_not_in_range import factor_min_not_in_range
from watchmen_dqc.monitor.rule.factor_mismatch_type import factor_mismatch_type
from watchmen_dqc.monitor.rule.factor_not_in_range import factor_not_in_range
from watchmen_dqc.monitor.rule.factor_string_length_mismatch import factor_string_length_mismatch
from watchmen_dqc.monitor.rule.factor_string_length_not_in_range import factor_string_length_not_in_range
from watchmen_dqc.monitor.rule.rows_no_change import rows_no_change
from watchmen_dqc.monitor.rule.trigger_pipeline import trigger
from watchmen_dqc.monitor.rule.types import RuleResult
from .retrieve_all_data_rules import run_retrieve_all_data_rules
from .retrieve_distinct_data_rules import run_retrieve_distinct_data_rules, should_retrieve_distinct_data

in_storage_rules_map: Dict[MonitorRuleCode, Any] = {
	MonitorRuleCode.ROWS_NO_CHANGE: rows_no_change,
	MonitorRuleCode.FACTOR_EMPTY_OVER_COVERAGE: factor_empty_over_coverage,
	MonitorRuleCode.FACTOR_MISMATCH_TYPE: factor_mismatch_type,
	MonitorRuleCode.FACTOR_IS_EMPTY: factor_is_empty,
	MonitorRuleCode.FACTOR_IS_BLANK: factor_is_blank,
	MonitorRuleCode.FACTOR_STRING_LENGTH_MISMATCH: factor_string_length_mismatch,
	MonitorRuleCode.FACTOR_STRING_LENGTH_NOT_IN_RANGE: factor_string_length_not_in_range,
	MonitorRuleCode.FACTOR_NOT_IN_RANGE: factor_not_in_range,
	MonitorRuleCode.FACTOR_MAX_NOT_IN_RANGE: factor_max_not_in_range,
	MonitorRuleCode.FACTOR_MIN_NOT_IN_RANGE: factor_min_not_in_range,
	MonitorRuleCode.FACTOR_AVG_NOT_IN_RANGE: factor_avg_not_in_range,
	MonitorRuleCode.FACTOR_AND_ANOTHER: factor_and_another,
}


def should_retrieve_all_data(rule: MonitorRule) -> bool:
	return rule.code in [
		MonitorRuleCode.FACTOR_MEDIAN_NOT_IN_RANGE,
		MonitorRuleCode.FACTOR_QUANTILE_NOT_IN_RANGE,
		MonitorRuleCode.FACTOR_STDEV_NOT_IN_RANGE
	]


def could_run_in_storage(rule: MonitorRule) -> bool:
	rule_code = rule.code
	if rule_code in disabled_rules:
		return False
	elif rule_code == MonitorRuleCode.ROWS_NOT_EXISTS:
		return False
	elif rule_code == MonitorRuleCode.ROWS_COUNT_MISMATCH_AND_ANOTHER:
		return False
	elif should_retrieve_all_data(rule):
		return False
	elif should_retrieve_distinct_data(rule):
		return False
	return True


def accept_result(result: Tuple[MonitorRule, RuleResult]) -> bool:
	return result[1] != RuleResult.IGNORED


def run_all_rules(
		data_service: TopicDataService, rules: List[MonitorRule],
		date_range: Tuple[datetime, datetime],
		changed_rows_count_in_range: int, total_rows_count: int) -> None:
	def run_rule(rule: MonitorRule) -> Tuple[MonitorRule, RuleResult]:
		result = in_storage_rules_map[rule.code](
			data_service, rule, date_range, changed_rows_count_in_range, total_rows_count)
		return rule, result

	def trigger_pipeline(result: Tuple[MonitorRule, RuleResult]) -> None:
		trigger(result[0], result[1], date_range[0], data_service.get_principal_service())

	ArrayHelper(rules).filter(could_run_in_storage).map(run_rule).filter(accept_result).each(trigger_pipeline)

	retrieve_distinct_data_rules = ArrayHelper(rules).filter(should_retrieve_distinct_data).to_list()
	if len(retrieve_distinct_data_rules) != 0:
		results = run_retrieve_distinct_data_rules(
			data_service, retrieve_distinct_data_rules, date_range, changed_rows_count_in_range, total_rows_count)
		ArrayHelper(results).filter(accept_result).each(trigger_pipeline)

	retrieve_all_data_rules = ArrayHelper(rules).filter(should_retrieve_all_data).to_list()
	if len(retrieve_all_data_rules) != 0:
		results = run_retrieve_all_data_rules(
			data_service, retrieve_all_data_rules, date_range, changed_rows_count_in_range, total_rows_count)
		ArrayHelper(results).filter(accept_result).each(trigger_pipeline)
