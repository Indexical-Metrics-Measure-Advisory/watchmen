from enum import Enum
from typing import List, Optional

from pydantic import ConfigDict
from watchmen_model.common import Auditable, UserBasedTuple
from watchmen_utilities import ExtendedBaseModel


class SubscriptionFrequency(str, Enum):
	ONCE = 'once'
	DAY = 'day'
	WEEK = 'week'
	BIWEEKLY = 'biweekly'
	MONTH = 'month'
	YEAR = 'year'


class SubscriptionWeekday(str, Enum):
	MON = 'mon'
	TUE = 'tue'
	WED = 'wed'
	THU = 'thu'
	FRI = 'fri'
	SAT = 'sat'
	SUN = 'sun'


class SubscriptionMonth(str, Enum):
	JAN = 'jan'
	FEB = 'feb'
	MAR = 'mar'
	APR = 'apr'
	MAY = 'may'
	JUN = 'jun'
	JUL = 'jul'
	AUG = 'aug'
	SEP = 'sep'
	OCT = 'oct'
	NOV = 'nov'
	DEC = 'dec'


class Subscription(ExtendedBaseModel, UserBasedTuple, Auditable):
	id: str
	analysisId: str
	frequency: SubscriptionFrequency
	interval: Optional[int] = None
	time: Optional[str] = None  # HH:MM
	date: Optional[str] = None  # YYYY-MM-DD (for 'once')
	weekday: Optional[SubscriptionWeekday] = None  # 'mon', 'tue', ... for 'week', 'biweekly'
	dayOfMonth: Optional[int] = None  # 1-31 for 'month'
	month: Optional[SubscriptionMonth] = None  # 'jan', 'feb', ... for 'year'
	recipients: List[str] = []
	enabled: bool = True

	model_config = ConfigDict(use_enum_values=True)
