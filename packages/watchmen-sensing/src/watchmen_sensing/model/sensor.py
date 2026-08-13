from enum import Enum
from typing import Any, Dict, Optional

from watchmen_model.common import Auditable, OptimisticLock, TenantBasedTuple
from watchmen_utilities import ExtendedBaseModel

from watchmen_sensing.model.signal import SignalCategory


class SensorStatus(str, Enum):
	ENABLED = 'enabled'
	DISABLED = 'disabled'


class SensorPriority(str, Enum):
	P0 = 'P0'
	P1 = 'P1'
	P2 = 'P2'


class Sensor(ExtendedBaseModel, TenantBasedTuple, OptimisticLock, Auditable):
	"""A configured sensor. User-editable, therefore optimistic-locked."""
	sensorId: Optional[str] = None
	name: str
	category: SignalCategory
	sensorType: str
	priority: SensorPriority = SensorPriority.P0
	enabled: bool = False
	# A cron expression or an interval string like 'interval:300s'.
	schedule: Optional[str] = None
	config: Optional[Dict[str, Any]] = {}
	status: SensorStatus = SensorStatus.DISABLED
