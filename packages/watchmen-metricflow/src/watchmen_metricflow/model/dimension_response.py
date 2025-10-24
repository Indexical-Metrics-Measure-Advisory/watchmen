from enum import Enum
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any

from watchmen_utilities import ExtendedBaseModel


class DimensionType(Enum):
    """维度类型枚举"""
    CATEGORICAL = "categorical"
    TIME = "time"
    ENTITY = "entity"
    CUSTOM = "custom"


class DimensionInfo(BaseModel):
    """单个维度信息模型"""
    # model_config = ConfigDict(use_enum_values=True)
    
    name: str = Field(..., description="维度名称")
    qualified_name: str = Field(..., description="维度限定名称")
    description: Optional[str] = Field(None, description="维度描述")
    type: str = Field(..., description="维度类型")
    
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
    """维度列表响应模型"""
    # model_config = ConfigDict(use_enum_values=True)
    
    dimensions: List[DimensionInfo] = Field(default_factory=list, description="维度列表")
    total_count: int = Field(0, description="维度总数")
    
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
    """单个指标信息模型"""
    # model_config = ConfigDict(use_enum_values=True)
    
    name: str = Field(..., description="指标名称")
    label: Optional[str] = Field(None, description="指标标签")
    description: Optional[str] = Field(None, description="指标描述")
    type: str = Field(..., description="指标类型")
    
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
    """指标列表响应模型"""
    # model_config = ConfigDict(use_enum_values=True)
    
    metrics: List[MetricInfo] = Field(default_factory=list, description="指标列表")
    total_count: int = Field(0, description="指标总数")
    
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