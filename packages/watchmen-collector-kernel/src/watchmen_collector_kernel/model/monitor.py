from datetime import datetime
from typing import Optional

from watchmen_model.common import TenantBasedTuple
from watchmen_utilities import ExtendedBaseModel


class EventResultRecord(TenantBasedTuple, ExtendedBaseModel):
    eventTriggerId: Optional[int] = None
    moduleTriggerId: Optional[int] = None
    modelTriggerId: Optional[int] = None
    tableTriggerId: Optional[int] = None
    moduleName: Optional[str] = None
    modelName: Optional[str] = None
    tableName: Optional[str] = None
    startTime: Optional[datetime] = None
    dataCount: Optional[int] = None
    jsonCount: Optional[int] = None
    jsonFinishedCount: Optional[int] = None
    status: Optional[int] = None
    percent: Optional[float] = None
    errors: Optional[int] = None