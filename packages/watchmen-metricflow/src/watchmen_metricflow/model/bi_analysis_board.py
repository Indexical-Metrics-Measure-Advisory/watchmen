from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, ConfigDict
from watchmen_utilities import ExtendedBaseModel
from watchmen_model.common import TenantBasedTuple, Auditable, OptimisticLock, UserBasedTuple, LastVisit
import json
from pprint import pprint



class BIMetricKind(str,Enum):
    COUNT = "count"
    RATE = "rate"
    AMOUNT = "amount"



class BIChartType(str, Enum):
    LINE = "line"
    BAR = "bar"
    STACKED_BAR = "stackedBar"
    PIE = "pie"
    AREA = "area"
    GROUPED_BAR = "groupedBar"
    ALERT = "alert"
    


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



class AlertPriority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    CRITICAL = "critical"


class AlertOperator(str, Enum):
    GT = ">"
    LT = "<"
    GE = ">="
    LE = "<="
    EQ = "=="
    NE = "!="


class AlertConditionLogic(str, Enum):
    AND = "and"
    OR = "or"


class AlertCondition(ExtendedBaseModel):
    field: Optional[str] = None
    operator: Optional[AlertOperator] = None
    value: Optional[float] = None


class LegacyAlertCondition(ExtendedBaseModel):
    operator: AlertOperator
    value: float


class AlertAction(ExtendedBaseModel):
    type: Optional[str] = "notification"
    riskLevel: Optional[AlertPriority] = None
    name: Optional[str] = None
    content: Optional[str] = None
    expectedEffect: Optional[str] = None


class AlertConfig(ExtendedBaseModel):
    enabled: bool = False
    name: Optional[str] = None
    priority: Optional[AlertPriority] = None
    description: Optional[str] = None
    conditionLogic: Optional[AlertConditionLogic] = None
    conditions: Optional[List[AlertCondition]] = None
    condition: Optional[LegacyAlertCondition] = None
    actions: Optional[List[AlertAction]] = None
    nextAction: Optional[AlertAction] = None
    decision: Optional[str] = None

    model_config = ConfigDict(use_enum_values=True)


class BIChartCard(ExtendedBaseModel):
    id: str
    title: str
    metricId: str
    chartType: Optional[BIChartType] = None
    size: Optional[BICardSize] = None
    selection: Optional[BIDimensionSelection] = None
    alert: Optional[AlertConfig] = None
    model_config = ConfigDict(use_enum_values=True)


class BIAnalysis(ExtendedBaseModel, UserBasedTuple, Auditable):
    id: str
    name: str
    isTemplate: Optional[bool] = False
    description: Optional[str] = None
    cards: Optional[List[BIChartCard]] = []

    # 审计字段由 Auditable 混入提供：createdAt, createdBy, lastModifiedAt, lastModifiedBy
    # 乐观锁字段由 OptimisticLock 混入提供：version
    model_config = ConfigDict(use_enum_values=True)


class BIAnalysisInput(BaseModel):
    id: str
    isTemplate: Optional[bool] = False



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




bi_analysis = """
{"id":"","name":"alert 1","description":"","cards":[{"id":"card_1765460401411","title":"High Revenue Alert","metricId":"total_revenue","chartType":"alert","size":"md","selection":{"dimensions":[],"timeRange":"Past 30 days"},"alert":{"id":"global-rule-1","metricId":"total_revenue","enabled":true,"condition":{"operator":">","value":100000},"nextAction":{"type":"notification"},"name":"High Revenue Alert","priority":"high","description":"Alert when revenue exceeds 100k","createdAt":"2024-01-01T00:00:00Z","updatedAt":"2024-01-01T00:00:00Z"}}],"userId":"1071081977535114240"}
"""

# test BIAnalysis 
# Parse the JSON string into a Python dict
data = json.loads(bi_analysis)

# Convert dict to BIAnalysis model instance
analysis = BIAnalysis(**data)

# Pretty-print the model to verify correctness
pprint(analysis.model_dump())




