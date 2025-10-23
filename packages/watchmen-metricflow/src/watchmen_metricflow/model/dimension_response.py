from enum import Enum
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any

from watchmen_utilities import ExtendedBaseModel


class DimensionType(Enum):
    """Dimension type enumeration"""
    CATEGORICAL = "categorical"
    TIME = "time"
    ENTITY = "entity"
    CUSTOM = "custom"


class DimensionInfo(BaseModel):
    """Single dimension information model"""
    # model_config = ConfigDict(use_enum_values=True)
    
    name: str = Field(..., description="Dimension name")
    qualified_name: str = Field(..., description="Dimension qualified name")
    description: Optional[str] = Field(None, description="Dimension description")
    type: str = Field(..., description="Dimension type")
    
    # class Config:
    #     json_schema_extra = {
    #         "example": {
    #             "name": "customer_id",
    #             "qualified_name": "customer__customer_id",
    #             "description": "Customer unique identifier",
    #             "type": "categorical"
    #         }
    #     }


class DimensionListResponse(BaseModel):
    """Dimension list response model"""
    # model_config = ConfigDict(use_enum_values=True)
    
    dimensions: List[DimensionInfo] = Field(default_factory=list, description="Dimension list")
    total_count: int = Field(0, description="Total count of dimensions")
    
    # class Config:
    #     json_schema_extra = {
    #         "example": {
    #             "dimensions": [
    #                 {
    #                     "name": "customer_id",
    #                     "qualified_name": "customer__customer_id",
    #                     "description": "Customer unique identifier",
    #                     "type": "categorical"
    #                 },
    #                 {
    #                     "name": "order_date",
    #                     "qualified_name": "order__order_date",
    #                     "description": "Order date",
    #                     "type": "time"
    #                 }
    #             ],
    #             "total_count": 2
    #         }
    #     }


class MetricInfo(BaseModel):
    """Single metric information model"""
    # model_config = ConfigDict(use_enum_values=True)
    
    name: str = Field(..., description="Metric name")
    label: Optional[str] = Field(None, description="Metric label")
    description: Optional[str] = Field(None, description="Metric description")
    type: str = Field(..., description="Metric type")
    
    # class Config:
    #     json_schema_extra = {
    #         "example": {
    #             "name": "total_revenue",
    #             "label": "Total Revenue",
    #             "description": "Total revenue from orders",
    #             "type": "simple"
    #         }
    #     }


class MetricListResponse(BaseModel):
    """Metric list response model"""
    # model_config = ConfigDict(use_enum_values=True)
    
    metrics: List[MetricInfo] = Field(default_factory=list, description="Metric list")
    total_count: int = Field(0, description="Total count of metrics")
    
    # class Config:
    #     json_schema_extra = {
    #         "example": {
    #             "metrics": [
    #                 {
    #                     "name": "total_revenue",
    #                     "qualified_name": "order__total_revenue",
    #                     "description": "Total revenue from orders",
    #                     "type": "simple"
    #                 }
    #             ],
    #             "total_count": 1
    #         }
    #     }