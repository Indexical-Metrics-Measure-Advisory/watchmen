from enum import Enum
from typing import Optional

from watchmen_model.admin import UserRole
from watchmen_model.common import EventDefinitionId, OptimisticLock, Tuple
from watchmen_utilities import ExtendedBaseModel


class EventType(str, Enum):
	SYSTEM = 'system',
	BUSINESS = 'business'


class EventSource(str, Enum):
	SUBJECT = "subject"
	OBJECTIVE_ANALYSIS = "objective_analysis"


class EventDefinition(ExtendedBaseModel, Tuple, OptimisticLock):
	eventDefinitionId: Optional[EventDefinitionId] = None
	eventCode: Optional[str] = None
	eventName: Optional[str] = None
	eventType: Optional[EventType] = None
	eventSource: Optional[EventSource] = None
	role: Optional[UserRole] = None
