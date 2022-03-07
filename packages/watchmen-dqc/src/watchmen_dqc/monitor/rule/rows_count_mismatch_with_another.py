from typing import Optional

from watchmen_data_kernel.storage import TopicDataService
from watchmen_model.dqc import MonitorRule


def rows_count_mismatch_with_another(
		data_service: TopicDataService, rule: MonitorRule,
		count: Optional[int] = None) -> None:
	if count is None:
		# get count of changed rows of current topic
		count = 100
	# get count of changed rows of another topic
	another_count = 200
	if count != another_count:
		# TODO rule matched, trigger a pipeline
		pass
