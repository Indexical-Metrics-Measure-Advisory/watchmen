from datetime import datetime
from typing import Any, Dict, List, Tuple

from watchmen_data_kernel.storage import TopicDataService
from watchmen_dqc.monitor.rule.types import AllDataRuleHandler
from watchmen_model.admin import Factor
from watchmen_model.dqc import MonitorRule, MonitorRuleCode
from watchmen_utilities import ArrayHelper
from .data_service_utils import build_date_range_criteria
from .retrieve_data_rules_utils import find_factors_and_log_missed, group_rules_by_factor

retrieve_all_data_rules_map: Dict[MonitorRuleCode, AllDataRuleHandler] = {
	MonitorRuleCode.FACTOR_MEDIAN_NOT_IN_RANGE: factor_median_not_in_range,
	MonitorRuleCode.FACTOR_QUANTILE_NOT_IN_RANGE: factor_quantile_not_in_range,
	MonitorRuleCode.FACTOR_STDEV_NOT_IN_RANGE: factor_stdev_not_in_range,
}


def run_retrieve_all_data_rules(
		data_service: TopicDataService, rules: List[MonitorRule],
		date_range: Tuple[datetime, datetime],
		changed_rows_count_in_range: int, total_rows_count: int) -> None:
	"""
	run rules which should retrieve all data,
	make sure pass-in rules are qualified, will not check them inside
	"""
	rules_by_factor = group_rules_by_factor(rules)
	factors = find_factors_and_log_missed(data_service, rules_by_factor)

	data_entity_helper = data_service.get_data_entity_helper()
	column_names = ArrayHelper(factors).map(lambda x: data_entity_helper.get_column_name(x.name)).to_list()
	rows = data_service.find_distinct_values(
		criteria=build_date_range_criteria(date_range),
		column_names=column_names,
		distinct_value_on_single_column=True
	)

	# deal with data
	def translate_to_array(data_rows: List[Dict[str, Any]], factor: Factor) -> List[Any]:
		return ArrayHelper(data_rows).map(lambda x: x.get(factor.name)).to_list()

	def run_rules(factor: Factor, data: List[Any]) -> None:
		concerned_rules = rules_by_factor.get(factor.factorId)
		if concerned_rules is None or len(concerned_rules) == 0:
			return

		def run_rule(rule: MonitorRule) -> None:
			retrieve_all_data_rules_map[rule.code](
				data, rule, date_range, changed_rows_count_in_range, total_rows_count)

		ArrayHelper(concerned_rules).each(run_rule)

	ArrayHelper(factors).map(lambda x: (x, translate_to_array(rows, x))) \
		.each(lambda x: run_rules(x[0], x[1]))
