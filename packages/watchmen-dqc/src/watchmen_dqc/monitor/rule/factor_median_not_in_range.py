from datetime import datetime
from typing import Any, List, Tuple

from watchmen_data_kernel.storage import TopicDataService
from watchmen_dqc.util import build_data_frame, convert_data_frame_type_by_types
from watchmen_model.admin import Factor, FactorType
from watchmen_model.dqc import MonitorRule
from .types import RuleResult
from .value_range import in_range


# noinspection PyUnusedLocal
def factor_median_not_in_range(
		data_service: TopicDataService, factor: Factor,
		data: List[List[Any]], rule: MonitorRule,
		date_range: Tuple[datetime, datetime],
		changed_rows_count_in_range: int, total_rows_count: int
) -> RuleResult:
	data_frame = build_data_frame(data, ['value'])
	data_frame = convert_data_frame_type_by_types(data_frame, {'value': FactorType.NUMBER})
	media = data_frame['value'].median()

	passed = in_range(media, rule.params.min, rule.params.max)

	return RuleResult.SUCCESS if passed else RuleResult.FAILED
