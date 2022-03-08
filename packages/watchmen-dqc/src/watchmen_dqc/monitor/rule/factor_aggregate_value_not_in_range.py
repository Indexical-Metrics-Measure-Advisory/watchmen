from datetime import datetime
from typing import Tuple

from watchmen_data_kernel.storage import TopicDataService
from watchmen_model.dqc import MonitorRule
from watchmen_storage import EntityColumnAggregateArithmetic, EntityStraightAggregateColumn
from watchmen_utilities import is_decimal
from .data_service_utils import build_date_range_criteria, find_factor
from .types import RuleResult
from .value_range import in_range


def factor_aggregate_value_not_in_range(
		data_service: TopicDataService, rule: MonitorRule,
		date_range: Tuple[datetime, datetime],
		arithmetic: EntityColumnAggregateArithmetic
) -> RuleResult:
	found, factor = find_factor(data_service, rule.factorId, rule)
	if not found:
		return RuleResult.IGNORED

	column_name = data_service.get_data_entity_helper().get_column_name(factor.name)
	data = data_service.find_straight_values(
		columns=[EntityStraightAggregateColumn(arithmetic=arithmetic, columnName=column_name)],
		criteria=build_date_range_criteria(date_range))
	if len(data) == 0:
		# no data found
		return RuleResult.SUCCESS

	parsed, value = is_decimal(data[0].get(column_name))
	if not parsed:
		# not a decimal, cannot do comparison
		return RuleResult.FAILED

	passed = in_range(value, rule.params.min, rule.params.max)

	return RuleResult.SUCCESS if passed else RuleResult.FAILED
