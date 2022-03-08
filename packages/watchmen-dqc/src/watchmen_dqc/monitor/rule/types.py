from datetime import datetime
from enum import Enum
from typing import Callable, Tuple

from watchmen_data_kernel.storage import TopicDataService
from watchmen_model.dqc import MonitorRule


class RuleResult(str, Enum):
	SUCCESS = 'success',
	FAILED = 'failed',
	IGNORED = 'ignored'


RuleHandler = Callable[[TopicDataService, MonitorRule, Tuple[datetime, datetime], int], RuleResult]
