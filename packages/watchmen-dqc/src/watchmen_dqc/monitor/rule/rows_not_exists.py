from datetime import datetime
from typing import Optional, Tuple

from watchmen_data_kernel.storage import TopicDataService
from watchmen_model.dqc import MonitorRule


def rows_not_exists(
		data_service: TopicDataService, rule: Optional[MonitorRule],
		date_range: Tuple[datetime, datetime]
) -> int:
	count = data_service.count()
	if rule is not None and count == 0:
		# TODO rule matched, trigger a pipeline
		pass

	return count
