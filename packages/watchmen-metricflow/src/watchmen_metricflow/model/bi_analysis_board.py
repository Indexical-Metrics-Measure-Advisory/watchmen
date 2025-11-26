from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, ConfigDict
from watchmen_utilities import ExtendedBaseModel
from watchmen_model.common import TenantBasedTuple, Auditable, OptimisticLock


class BIMetricKind(Enum):
    COUNT = "count"
    RATE = "rate"
    AMOUNT = "amount"


class BIChartType(Enum):
    LINE = "line"
    BAR = "bar"
    PIE = "pie"
    AREA = "area"


class BICardSize(Enum):
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"


class BICategory(ExtendedBaseModel):
    id: str
    name: str
    description: Optional[str] = None


class BIMetric(ExtendedBaseModel):
    id: str
    name: str
    description: Optional[str] = None
    category_id: str
    kind: BIMetricKind
    dimensions: List[str] = Field(default_factory=list)

    # 使用枚举值作为序列化输出
    model_config = ConfigDict(use_enum_values=True)


class BIDimensionSelection(BaseModel):
    # 使用枚举值作为序列化输出（虽未使用枚举，这里保持风格一致）
    model_config = ConfigDict(use_enum_values=True)

    dimensions: List[str] = Field(default_factory=list)
    time_range: Optional[str] = None


class BIChartCard(ExtendedBaseModel):
    id: str
    title: str
    metric_id: str
    chart_type: BIChartType
    size: BICardSize
    selection: BIDimensionSelection

    model_config = ConfigDict(use_enum_values=True)


class BIAnalysis(ExtendedBaseModel, TenantBasedTuple, Auditable, OptimisticLock):
    id: str
    name: str
    description: Optional[str] = None
    cards: List[BIChartCard] = Field(default_factory=list)

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
