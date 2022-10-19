from pydantic import BaseModel
from enum import Enum

from watchmen_model.admin import UserRole
from watchmen_model.common import OptimisticLock, Tuple
from watchmen_model.common.tuple_ids import EventDefinitionId


class EventType(str, Enum):
	SYSTEM = 'system',
	BUSINESS = 'business'


class EventSource(str,Enum):
	SUBJECT = "subject"
	OBJECTIVE_ANALYSIS = "objective_analysis"


class EventDefinition(Tuple,OptimisticLock, BaseModel):
	eventDefinitionId: EventDefinitionId = None
	eventCode: str = None
	eventName: str = None
	eventType: EventType = None
	eventSource: EventSource = None
	role: UserRole = None
