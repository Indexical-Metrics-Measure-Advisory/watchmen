from datetime import datetime
from logging import getLogger
from typing import Optional, Tuple

from watchmen_data_kernel.storage import TopicDataService
from watchmen_model.dqc import MonitorRule
from watchmen_utilities import is_blank
from .data_service_utils import exchange_topic_data_service
from .trigger_pipeline import trigger

logger = getLogger(__name__)


def do_it(
		data_service: TopicDataService, rule: Optional[MonitorRule],
		date_range: Tuple[datetime, datetime], count_of_current_topic: int) -> None:
	if rule is None:
		return
	# get count of changed rows of another topic
	another_topic_id = rule.params.topicId
	if is_blank(another_topic_id):
		logger.error(f'Another topic id not declared on rule[{rule.dict()}].')
		return

	another_data_service = exchange_topic_data_service(data_service, another_topic_id)
	another_count = another_data_service.count_changed_on_time_range(date_range[0], date_range[1])

	trigger(rule, count_of_current_topic == another_count, date_range[0], data_service.get_principal_service())


def rows_count_mismatch_with_another(
		data_service: TopicDataService, rule: Optional[MonitorRule],
		date_range: Tuple[datetime, datetime],
		count: Optional[int] = None) -> int:
	"""
	if given count is not none, which means already find the count somewhere, simply use this count as current.
	anyway, returns the current count
	"""
	if count is None:
		# get count of changed rows of current topic
		count = data_service.count_changed_on_time_range(date_range[0], date_range[1])

	do_it(data_service, rule, date_range, count)

	return count
