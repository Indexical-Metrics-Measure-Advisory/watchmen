from datetime import datetime

from watchmen_model.common import TenantBasedTuple
from pydantic import BaseModel


class TriggerEvent(TenantBasedTuple, BaseModel):
	eventTriggerId: str
	startTime: datetime
	endTime: datetime
	isFinished: bool = False