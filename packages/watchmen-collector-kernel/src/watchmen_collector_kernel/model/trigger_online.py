from typing import Dict, Optional

from watchmen_model.common import TenantBasedTuple
from watchmen_utilities import ExtendedBaseModel


class TriggerOnline(TenantBasedTuple, ExtendedBaseModel):
	onlineTriggerId: Optional[int] = None
	status: Optional[int] = None
	code: Optional[str] = None
	record: Optional[Dict] = None
	traceId: Optional[str] = None
	result:Optional[Dict] = None
