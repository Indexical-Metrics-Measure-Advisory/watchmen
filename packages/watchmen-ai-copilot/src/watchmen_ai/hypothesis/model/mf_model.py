import datetime as dt
from typing import Optional, List

from pydantic import BaseModel


class MetricQueryRequest(BaseModel):
    metrics: Optional[List[str]] = None
    group_by: Optional[List[str]] = None
    where: Optional[List[str]] = None
    start_time: Optional[dt.datetime] = None
    end_time: Optional[dt.datetime] = None
    order: Optional[List[str]] = []
    limit: Optional[int] = 0



