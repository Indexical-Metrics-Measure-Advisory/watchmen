from datetime import datetime
from logging import getLogger
from typing import Any, Dict, List, Tuple

from watchmen_data_kernel.storage import TopicDataService
from watchmen_model.admin import Factor
from watchmen_model.dqc import MonitorRule, MonitorRuleCode
from watchmen_storage import EntityColumnAggregateArithmetic, EntityStraightAggregateColumn
from watchmen_utilities import ArrayHelper
from .data_service_utils import build_date_range_criteria
from .factor_common_value_not_in_range import factor_common_value_not_in_range
from .factor_common_value_over_coverage import factor_common_value_over_coverage
from .factor_match_regexp import factor_match_regexp
from .factor_mismatch_enum import factor_mismatch_enum
from .factor_mismatch_regexp import factor_mismatch_regexp
from .retrieve_data_rules_utils import find_factors_and_log_missed, group_rules_by_factor
from .types import DistinctDataRuleHandler, RuleResult

logger = getLogger(__name__)

retrieve_distinct_data_rules_map: Dict[MonitorRuleCode, DistinctDataRuleHandler] = {
	MonitorRuleCode.FACTOR_MISMATCH_ENUM: factor_mismatch_enum,
	MonitorRuleCode.FACTOR_MATCH_REGEXP: factor_match_regexp,
	MonitorRuleCode.FACTOR_MISMATCH_REGEXP: factor_mismatch_regexp,
	MonitorRuleCode.FACTOR_COMMON_VALUE_OVER_COVERAGE: factor_common_value_over_coverage,
	MonitorRuleCode.FACTOR_COMMON_VALUE_NOT_IN_RANGE: factor_common_value_not_in_range
}


def should_retrieve_distinct_data(rule: MonitorRule) -> bool:
	return rule.code in list(retrieve_distinct_data_rules_map.keys())


def run_retrieve_distinct_data_rules(
		data_service: TopicDataService, rules: List[MonitorRule],
		date_range: Tuple[datetime, datetime],
		changed_rows_count_in_range: int, total_rows_count: int) -> List[Tuple[MonitorRule, RuleResult]]:
	"""
	run rules which should retrieve distinct data and count,
	make sure pass-in rules are qualified, will not check them inside
	"""
	rules_by_factor = group_rules_by_factor(rules)
	factors = find_factors_and_log_missed(data_service, rules_by_factor)

	data_entity_helper = data_service.get_data_entity_helper()

	# deal with data
	def translate_to_array(data_rows: List[Dict[str, Any]], factor: Factor) -> List[Tuple[Any, int]]:
		column_name = data_entity_helper.get_column_name(factor.name)
		return ArrayHelper(data_rows).map(lambda x: (x.get(column_name), x.get('count'))).to_list()

	def run_rules(factor: Factor) -> List[Tuple[MonitorRule, RuleResult]]:
		concerned_rules = rules_by_factor.get(factor.factorId)
		if concerned_rules is None or len(concerned_rules) == 0:
			return []

		# retrieve data,
		rows = data_service.find_straight_values(
			criteria=build_date_range_criteria(date_range),
			columns=[
				EntityStraightAggregateColumn(
					arithmetic=EntityColumnAggregateArithmetic.COUNT,
					columnName=data_entity_helper.get_column_name(factor.name),
					alias='count'),
				EntityStraightAggregateColumn(
					columnName=data_entity_helper.get_column_name(factor.name))
			])
		data = translate_to_array(rows, factor)

		def run_rule(rule: MonitorRule) -> Tuple[MonitorRule, RuleResult]:
			result = retrieve_distinct_data_rules_map[rule.code](
				data_service, factor, data, rule, date_range, changed_rows_count_in_range, total_rows_count)
			return rule, result

		return ArrayHelper(concerned_rules).map(run_rule).to_list()

	return ArrayHelper(factors).map(lambda x: run_rules(x)) \
		.reduce(lambda all_results, x: [*all_results, *x], [])
