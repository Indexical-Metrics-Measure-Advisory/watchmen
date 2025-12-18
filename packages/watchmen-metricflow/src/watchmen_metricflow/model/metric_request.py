import json
import datetime as dt
from pydantic import BaseModel, validator, field_validator
from typing import Optional, Sequence, List

from .semantic import TimeGranularity

class MetricsQueryRequest(BaseModel):
    metrics: Optional[List[str]] = None
    group_by: Optional[List[str]] = None
    where: Optional[str] = None
    start_time: Optional[dt.datetime] = None
    end_time: Optional[dt.datetime] = None
    order: Optional[List[str]] = None
    limit: Optional[int] = None

class MetricQueryRequest(BaseModel):
    metric: str = None
    group_by: Optional[List[str]] = None
    where: Optional[str] = None
    time_granularity: Optional[TimeGranularity] = None
    start_time: Optional[dt.datetime] = None
    end_time: Optional[dt.datetime] = None
    order: Optional[List[str]] = None
    limit: Optional[int] = None




class MetricDimensionRequest(BaseModel):
    metricName:str = None
    dimensionName:str = None
    start_time: Optional[dt.datetime] = None
    end_time: Optional[dt.datetime] = None

