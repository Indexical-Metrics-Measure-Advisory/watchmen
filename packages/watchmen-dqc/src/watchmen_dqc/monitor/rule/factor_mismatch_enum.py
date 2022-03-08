from datetime import datetime
from logging import getLogger
from typing import Tuple

from watchmen_data_kernel.storage import TopicDataService
from watchmen_model.dqc import MonitorRule
from watchmen_utilities import ArrayHelper, is_blank
from .data_service_utils import build_date_range_criteria, find_factor
from .enum_service import enum_service
from .types import RuleResult

logger = getLogger(__name__)


# noinspection PyUnusedLocal
def factor_mismatch_enum(
		data_service: TopicDataService, rule: MonitorRule,
		date_range: Tuple[datetime, datetime],
		changed_rows_count_in_range: int, total_rows_count: int
) -> RuleResult:
	found, factor = find_factor(data_service, rule.factorId, rule)
	if not found:
		return RuleResult.IGNORED
	enum_id = factor.enumId
	if is_blank(enum_id):
		logger.error(f'Enum id not declared on factor[{factor.dict()}].')
		return RuleResult.IGNORED

	rows = data_service.find_distinct_values(
		criteria=build_date_range_criteria(date_range),
		column_names=[data_service.get_data_entity_helper().get_column_name(factor.name)],
		distinct_value_on_single_column=True
	)
	mismatched = ArrayHelper(rows) \
		.map(lambda row: row.get(factor.name)) \
		.some(lambda x: enum_service.exists(enum_id, x))

	return RuleResult.FAILED if mismatched else RuleResult.SUCCESS
