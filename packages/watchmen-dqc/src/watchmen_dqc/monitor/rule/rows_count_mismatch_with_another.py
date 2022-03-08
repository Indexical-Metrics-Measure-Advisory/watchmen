from datetime import datetime
from logging import getLogger
from typing import Optional, Tuple

from watchmen_data_kernel.storage import TopicDataService
from watchmen_model.dqc import MonitorRule
from watchmen_utilities import is_blank
from .data_service_utils import build_date_range_criteria, exchange_topic_data_service
from .trigger_pipeline import trigger
from .types import RuleResult

logger = getLogger(__name__)


def do_it(
		data_service: TopicDataService, rule: Optional[MonitorRule],
		date_range: Tuple[datetime, datetime], changed_row_count: int) -> None:
	if rule is None:
		return
	# get count of changed rows of another topic
	another_topic_id = rule.params.topicId
	if is_blank(another_topic_id):
		logger.error(f'Another topic id not declared on rule[{rule.dict()}].')
		return

	another_data_service = exchange_topic_data_service(data_service, another_topic_id)
	changed_row_count_of_another = another_data_service.count_by_criteria(build_date_range_criteria(date_range))

	trigger(
		rule, RuleResult.FAILED if changed_row_count != changed_row_count_of_another else RuleResult.SUCCESS,
		date_range[0], data_service.get_principal_service())


def rows_count_mismatch_with_another(
		data_service: TopicDataService, rule: Optional[MonitorRule],
		date_range: Tuple[datetime, datetime],
		has_data: bool) -> int:
	"""
	if given count is not none, which means already find the count somewhere, simply use this count as current.
	anyway, returns the current count
	"""
	if has_data:
		# get count of changed rows of current topic
		changed_row_count = data_service.count_by_criteria(build_date_range_criteria(date_range))
	else:
		changed_row_count = 0

	do_it(data_service, rule, date_range, changed_row_count)

	return changed_row_count
