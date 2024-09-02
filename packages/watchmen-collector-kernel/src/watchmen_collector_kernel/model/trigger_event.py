from datetime import datetime
from enum import Enum
from typing import List, Dict, Optional

from watchmen_model.common import TenantBasedTuple
from watchmen_utilities import ExtendedBaseModel


class EventType(int, Enum):
	DEFAULT = 1,
	BY_TABLE = 2,
	BY_RECORD = 3,
	BY_PIPELINE = 4


class TriggerEvent(TenantBasedTuple, ExtendedBaseModel):
	eventTriggerId: Optional[int] = None
	startTime: Optional[datetime] = None
	endTime: Optional[datetime] = None
	isFinished: bool = False
	status: Optional[int] = None
	type: Optional[int] = None
	tableName: Optional[str] = None
	records: Optional[List[Dict]] = []
	pipelineId: Optional[str] = None

