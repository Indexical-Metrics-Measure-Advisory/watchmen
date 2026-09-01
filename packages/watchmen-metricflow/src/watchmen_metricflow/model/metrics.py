from enum import Enum
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any

from watchmen_model.common import Auditable, TenantBasedTuple, OptimisticLock
from watchmen_utilities import ExtendedBaseModel


class MetricType(Enum):
   
    SIMPLE = "simple"
    RATIO = "ratio"
    CUMULATIVE = "cumulative"
    DERIVED = "derived"
    CONVERSION = "conversion"


class MeasureReference(BaseModel):
    
    model_config = ConfigDict(use_enum_values=True)

    name: str
    filter: Optional[str] = None
    alias: Optional[str] = None
    join_to_timespine: bool = False
    fill_Nones_with: Optional[Any] = None


class ConversionTypeParams(BaseModel):
    
    model_config = ConfigDict(use_enum_values=True)



class WindowParams(BaseModel):

    count : int =None
    granularity :str =None
    window_string :str =None
    is_standard_granularity: bool =None
    model_config = ConfigDict(use_enum_values=True)


class OffsetWindow(BaseModel):
    count: int  =None
    granularity :Optional[str]= None

class MetricRef(BaseModel):
    name:str = None
    filter :Optional[str]=  None
    alias:Optional[str]= None
    offset_window :Optional[OffsetWindow]= None
    offset_to_grain:Optional[str]= None


class CumulativeTypeParams(BaseModel):

    model_config = ConfigDict(use_enum_values=True)

    measure: Optional[MeasureReference] = None
    metric: Optional[MetricRef] = None

class MetricTypeParams(BaseModel):
    
    model_config = ConfigDict(use_enum_values=True)

    measure: Optional[MeasureReference] = None
    numerator: Optional[MeasureReference] = None
    denominator: Optional[MeasureReference] = None
    expr: Optional[str] = None
    window: Optional[WindowParams] = None
    grain_to_date: Optional[str] = None
    metrics: List[MetricRef] = []
    conversion_type_params: Optional[ConversionTypeParams] = None
    cumulative_type_params: Optional[CumulativeTypeParams] = None
    input_measures: List[MeasureReference] = Field(default_factory=list)


class MetricConfig(BaseModel):
    
    model_config = ConfigDict(use_enum_values=True)

    meta: Dict[str, Any] = Field(default_factory=dict)

class MetricValidationStatus(Enum):
    PENDING = "pending"
    VALIDATED = "validated"
    FAILED = "failed"


class MetricPublishStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"


class MetricVersionOperationType(str, Enum):
    PUBLISH = "publish"
    ROLLBACK = "rollback"


class ValidationLogEntry(BaseModel):

    model_config = ConfigDict(use_enum_values=True)

    step: str
    status: str
    message: str
    timestamp: str
    details: Optional[Dict[str, Any]] = None


class MetricValidationResult(BaseModel):

    model_config = ConfigDict(use_enum_values=True)

    status: MetricValidationStatus
    logs: List[ValidationLogEntry] = Field(default_factory=list)
    dimension_count: Optional[int] = None
    sample_value: Optional[float] = None
    last_validated_at: Optional[str] = None
    error: Optional[str] = None






class Metric(ExtendedBaseModel, TenantBasedTuple, Auditable,OptimisticLock):
    
    # model_config = ConfigDict(use_enum_values=True)
    id: Optional[str] = None
    name: str
    description: Optional[str] = None
    type: MetricType
    type_params: MetricTypeParams
    filter: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    label: Optional[str] = None
    # display format of the metric value: number / currency / percentage
    format: Optional[str] = None
    # display unit of the metric value, free text (e.g. CNY, persons)
    unit: Optional[str] = None
    config: Optional[MetricConfig] = None
    time_granularity: Optional[str] = None
    # publish status of the metric: draft / published; None is treated as draft
    publishStatus: Optional[MetricPublishStatus] = None
    # version number of the currently published version; None when not published
    publishedVersionNo: Optional[int] = None
    # time when the metric was published
    lastPublishedAt: Optional[datetime] = None



class MetricWithCategory(Metric):
    categoryId: Optional[str] = None

    validationStatus: Optional[MetricValidationStatus] = None
    validationResult: Optional[MetricValidationResult] = None


class MetricVersion(ExtendedBaseModel, TenantBasedTuple, OptimisticLock):
    id: Optional[str] = None
    # stable metric id, keeps working even if the metric is renamed
    metricId: str
    # metric name at the time this version was recorded
    metricName: str
    versionNo: int
    operationType: MetricVersionOperationType
    # full serialized metric snapshot, restorable
    content: Dict[str, Any]
    # publish note or rollback reason, required on rollback
    comments: Optional[str] = None
    # currently published version when a rollback happened
    rollbackFromVersionNo: Optional[int] = None







