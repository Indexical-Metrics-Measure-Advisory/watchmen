from datetime import datetime
from typing import Optional, Tuple

from watchmen_data_kernel.storage import TopicDataService
from watchmen_model.dqc import MonitorRule
from .trigger_pipeline import trigger
from .types import RuleResult


def rows_not_exists(
		data_service: TopicDataService, rule: Optional[MonitorRule],
		date_range: Tuple[datetime, datetime]
) -> int:
	count = data_service.count()
	if rule is not None:
		trigger(
			rule, RuleResult.FAILED if count == 0 else RuleResult.SUCCESS,
			date_range[0], data_service.get_principal_service())

	return count
