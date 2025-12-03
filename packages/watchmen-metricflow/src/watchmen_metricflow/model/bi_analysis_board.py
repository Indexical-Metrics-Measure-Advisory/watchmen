from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, ConfigDict
from watchmen_utilities import ExtendedBaseModel
from watchmen_model.common import TenantBasedTuple, Auditable, OptimisticLock, UserBasedTuple, LastVisit


class BIMetricKind(str,Enum):
    COUNT = "count"
    RATE = "rate"
    AMOUNT = "amount"


class BIChartType(str,Enum):
    LINE = "line"
    BAR = "bar"
    PIE = "pie"
    AREA = "area"


class BICardSize(str,Enum):
    SMALL = "sm"
    MEDIUM = "md"
    LARGE = "lg"


class BICategory(ExtendedBaseModel):
    id: str
    name: str
    description: Optional[str] = None


class BIMetric(ExtendedBaseModel):
    id: str
    name: str
    description: Optional[str] = None
    categoryId: str
    kind: BIMetricKind
    dimensions: List[str] = Field(default_factory=list)

    # 使用枚举值作为序列化输出
    model_config = ConfigDict(use_enum_values=True)


class BIDimensionSelection(BaseModel):

    model_config = ConfigDict(use_enum_values=True)

    dimensions: Optional[List[str]] = None
    timeRange: Optional[str] = None


class BIChartCard(ExtendedBaseModel):
    id: str
    title: str
    metricId: str
    chartType: Optional[BIChartType] = None
    size: Optional[BICardSize] = None
    selection: Optional[ BIDimensionSelection] = None
    model_config = ConfigDict(use_enum_values=True)


class BIAnalysis(ExtendedBaseModel, UserBasedTuple, Auditable,LastVisit):
    id: str
    name: str
    description: Optional[str] = None
    cards: Optional[List[BIChartCard]] = []

    # 审计字段由 Auditable 混入提供：createdAt, createdBy, lastModifiedAt, lastModifiedBy
    # 乐观锁字段由 OptimisticLock 混入提供：version
    model_config = ConfigDict(use_enum_values=True)


class BIAnalysisInput(BaseModel):
    name: str
    description: Optional[str] = None
    cards: List[BIChartCard] = Field(default_factory=list)

    model_config = ConfigDict(use_enum_values=True)


class BIAnalysisUpdate(BaseModel):
    id: str
    name: Optional[str] = None
    description: Optional[str] = None
    cards: Optional[List[BIChartCard]] = None

    model_config = ConfigDict(use_enum_values=True)


class BIAnalysisListItem(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    card_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(use_enum_values=True)





json = {"id":"","name":"aaa","description":"","cards":[{"id":"card_1764593251449","title":"total_claim_cases · Past 30 days","metricId":"total_claim_cases","chartType":"bar","size":"md","selection":{"dimensions":["claim_case__accept_decision_desc"],"timeRange":"Past 30 days"}}]}


# 解析 JSON 字符串为 BIAnalysisInput 实例
analysis_input = BIAnalysis(**json)

print(analysis_input)