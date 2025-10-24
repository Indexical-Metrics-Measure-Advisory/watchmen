
import datetime as dt
from pydantic import BaseModel
from typing import Optional, Sequence, List


class MetricQueryRequest(BaseModel):
    metrics: Optional[Sequence[str]] = None
    group_by: Optional[Sequence[str]] = None
    where: Optional[str] = None
    start_time: Optional[dt.datetime] = None
    end_time: Optional[dt.datetime] = None
    order: Optional[List[str]] = None
    limit: Optional[int] = None


class MetricDimensionRequest(BaseModel):
    metricName:str = None
    dimensionName:str = None
    start_time: Optional[dt.datetime] = None
    end_time: Optional[dt.datetime] = None

