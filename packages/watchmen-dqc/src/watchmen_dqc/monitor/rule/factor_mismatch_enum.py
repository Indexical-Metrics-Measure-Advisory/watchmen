from datetime import datetime
from logging import getLogger
from typing import Any, List, Tuple

from watchmen_data_kernel.storage import TopicDataService
from watchmen_model.admin import Factor
from watchmen_model.dqc import MonitorRule
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank
from .enum_service import enum_service
from .types import RuleResult

logger = getLogger(__name__)


# noinspection PyUnusedLocal
def factor_mismatch_enum(
		data_service: TopicDataService, factor: Factor,
		data: List[Tuple[Any, int]], rule: MonitorRule,
		date_range: Tuple[datetime, datetime],
		changed_rows_count_in_range: int, total_rows_count: int
) -> RuleResult:
	enum_id = factor.enumId
	if is_blank(enum_id):
		logger.error(f'Enum id not declared on factor[{factor.dict()}].')
		return RuleResult.IGNORED

	mismatched = ArrayHelper(data) \
		.map(lambda row: row[0]) \
		.filter(lambda value: is_not_blank(value)) \
		.some(lambda x: not enum_service.exists(enum_id, x))

	return RuleResult.FAILED if mismatched else RuleResult.SUCCESS
