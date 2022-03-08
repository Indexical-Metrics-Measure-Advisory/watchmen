from datetime import datetime
from enum import Enum
from typing import Callable, Tuple

from watchmen_data_kernel.storage import TopicDataService
from watchmen_model.dqc import MonitorRule


class RuleResult(str, Enum):
	SUCCESS = 'success',  # no issue detected
	FAILED = 'failed',  # issue detected
	IGNORED = 'ignored'  # rule ignored


RuleHandler = Callable[[TopicDataService, MonitorRule, Tuple[datetime, datetime], int, int], RuleResult]
