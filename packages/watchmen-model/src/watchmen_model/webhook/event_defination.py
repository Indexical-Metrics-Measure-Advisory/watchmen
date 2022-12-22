from enum import Enum

from pydantic import BaseModel

from watchmen_model.admin import UserRole
from watchmen_model.common import EventDefinitionId, OptimisticLock, Tuple


class EventType(str, Enum):
	SYSTEM = 'system',
	BUSINESS = 'business'


class EventSource(str, Enum):
	SUBJECT = "subject"
	OBJECTIVE_ANALYSIS = "objective_analysis"


class EventDefinition(Tuple, OptimisticLock, BaseModel):
	eventDefinitionId: EventDefinitionId = None
	eventCode: str = None
	eventName: str = None
	eventType: EventType = None
	eventSource: EventSource = None
	role: UserRole = None
