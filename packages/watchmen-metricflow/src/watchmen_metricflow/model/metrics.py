from enum import Enum
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

    
    pass


class CumulativeTypeParams(BaseModel):
    
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


class Metric(ExtendedBaseModel, TenantBasedTuple, Auditable,OptimisticLock):
    
    # model_config = ConfigDict(use_enum_values=True)
    id:str
    name: str
    description: Optional[str] = None
    type: MetricType
    type_params: MetricTypeParams
    filter: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    label: Optional[str] = None
    config: Optional[MetricConfig] = None
    time_granularity: Optional[str] = None



class MetricWithCategory(Metric):
    categoryId: Optional[str] = None





# json ={"name":"total_claim_cases","label":"Total Claim Cases","description":"Total number of claim cases","type":"simple","type_params":{"expr":None,"window":None,"measure":{"name":"count_claim_cases","alias":None,"filter":None,"fill_Nones_with":None,"join_to_timespine":False},"metrics":[],"numerator":None,"denominator":None,"grain_to_date":None,"input_measures":[{"name":"count_claim_cases","alias":None,"filter":None,"fill_Nones_with":None,"join_to_timespine":False}],"conversion_type_params":None,"cumulative_type_params":None},"categoryId":"1443739740389882880"}

# MetricWithCategory(**json)
