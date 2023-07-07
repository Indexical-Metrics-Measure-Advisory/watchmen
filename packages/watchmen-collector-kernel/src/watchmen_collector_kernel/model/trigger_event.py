from datetime import datetime
from enum import Enum
from typing import List, Dict

from watchmen_model.common import TenantBasedTuple, Storable
from pydantic import BaseModel


class EventType(int, Enum):
	DEFAULT = 1,
	BY_TABLE = 2,
	BY_RECORD = 3


class TriggerEvent(TenantBasedTuple, BaseModel):
	eventTriggerId: int
	startTime: datetime
	endTime: datetime
	isFinished: bool = False
	status: int
	type: int
	tableName: str
	records: List[Dict] = []
