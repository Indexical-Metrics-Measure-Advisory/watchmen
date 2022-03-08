from datetime import datetime
from enum import Enum
from typing import Any, Callable, List, Tuple

from watchmen_data_kernel.storage import TopicDataService
from watchmen_model.admin import Factor
from watchmen_model.dqc import MonitorRule


class RuleResult(str, Enum):
	SUCCESS = 'success',  # no issue detected
	FAILED = 'failed',  # issue detected
	IGNORED = 'ignored'  # rule ignored


RuleHandler = Callable[[TopicDataService, MonitorRule, Tuple[datetime, datetime], int, int], RuleResult]
DistinctDataRuleHandler = Callable[
	[TopicDataService, Factor, List[Tuple[Any, int]], MonitorRule, Tuple[datetime, datetime], int, int],
	RuleResult
]
AllDataRuleHandler = Callable[
	[TopicDataService, Factor, List[List[Any]], MonitorRule, Tuple[datetime, datetime], int, int],
	RuleResult
]
