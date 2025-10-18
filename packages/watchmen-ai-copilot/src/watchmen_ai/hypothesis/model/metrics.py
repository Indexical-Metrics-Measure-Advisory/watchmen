from enum import Enum
from typing import Optional, List, Union

from watchmen_data_kernel.storage_bridge import PossibleParameterType
from watchmen_model.admin import FactorType
from watchmen_model.common import OptimisticLock, Auditable, ObjectiveTargetId, UserBasedTuple, ObjectiveId
from watchmen_utilities import ExtendedBaseModel


class EmulativeAnalysisMethod(str, Enum):

    TREND_ANALYSIS = 'Trend Analysis'
    DISTRIBUTION_ANALYSIS = 'Distribution Analysis'
    COMPARISON_ANALYSIS = 'Comparison Analysis'
    CORRELATION_ANALYSIS = 'Correlation Analysis'
    COMPOSITION_ANALYSIS = 'Composition Analysis'
    FEATURES_IMPORTANCE = 'Features importance'



class DimensionType(str, Enum):
    CATEGORICAL = 'CATEGORICAL'
    NUMERICAL = 'numerical'
    TIME = 'TIME'
    TEXT = 'text'
    BOOLEAN = 'boolean'
    GEO = 'geo'
    BUCKET = 'bucket'


class MetricFlowMetric(ExtendedBaseModel):
    name : str
    label: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None



class MetricDimension(ExtendedBaseModel):

    name: str
    description: Optional[str] = None
    qualified_name :Optional[str] = None
    importance: Optional[float] = None
    metricId: Optional[str] = None
    dimensionType:Optional[DimensionType] = None
    # factorType: Optional[Union[FactorType, PossibleParameterType]] = None


    def __setattr__(self, name, value):
        if name == 'factorType':
            if isinstance(value, str):
                self.__dict__[name] = FactorType(value)
            elif isinstance(value, FactorType):
                self.__dict__[name] = value
            else:
                raise ValueError(f"Invalid type for factorType: {type(value)}")

        else:
            super().__setattr__(name, value)


class MetricStatus(str, Enum):
    POSITIVE = 'positive'
    NEGATIVE = 'negative'
    NEUTRAL = 'neutral'

class MetricCategory(str,Enum):
    Volume = "Volume"
    Ratio = "Ratio"
    Average ="Average"
    Composition = "Composition"
    Change = "Change"

class MetricType(ExtendedBaseModel, UserBasedTuple, OptimisticLock, Auditable):
    id: Optional[str] = None
    name: Optional[str] = None
    value: Optional[float] = None
    valueReadable: Optional[str] = None
    unit: Optional[str] = None
    change: Optional[float] = None
    changeReadable: Optional[str] = None
    status: Optional[MetricStatus] = None
    description: Optional[str] = None
    category: Optional[MetricCategory] = None
    targetId: Optional[ObjectiveTargetId] = None
    objectiveId : Optional[ObjectiveId] = None
    emulativeAnalysisMethod: Optional[EmulativeAnalysisMethod] = None


def construct_dimension(value):
    if isinstance(value, MetricDimension):
        return value
    elif isinstance(value, dict):
        # noinspection PyArgumentList
        return MetricDimension(**value)



def construct_dimensions(value_list):
    if isinstance(value_list, list):
        return [construct_dimension(value) for value in value_list]
    elif isinstance(value_list, dict):
        return [construct_dimension(value_list)]
    else:
        raise ValueError(f"Invalid type for MetricDimension: {type(value_list)}")



def construct_metric(value):
    if isinstance(value, MetricType):
        return value
    elif isinstance(value, dict):
        # noinspection PyArgumentList
        return MetricType(**value)
    else:
        raise ValueError(f"Invalid type for MetricType: {type(value)}")



class MetricDetailType(ExtendedBaseModel):
    metric:MetricType = None
    # analysisMethod: Optional[EmulativeAnalysisMethod] = None
    dimensions:List[MetricDimension] = []

    def __setattr__(self, name, value):
        if name == 'metric':
            super().__setattr__(name, construct_metric(value))
        elif name == 'dimensions':
            super().__setattr__(name, construct_dimensions(value))
        else:
            super().__setattr__(name, value)