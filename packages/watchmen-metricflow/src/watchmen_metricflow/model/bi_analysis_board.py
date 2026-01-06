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
    KPI = "kpi"
    


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



from watchmen_metricflow.model.alert_rule import AlertConfig, AlertPriority, AlertOperator, AlertConditionLogic, AlertCondition, AlertAction


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


if __name__ == "__main__":
    json ="""
    {"id":"","name":"test analysis 2","description":"","cards":[{"id":"card_1765037388947","size":"md","title":"total_claim_cases · Past 30 days","metricId":"total_claim_cases","chartType":"bar","selection":{"timeRange":"Past 30 days","dimensions":["claim_case__accept_decision"]}},{"id":"card_1765902710607","title":"total_claim_cases · Past 30 days","metricId":"total_claim_cases","chartType":"bar","size":"md","selection":{"dimensions":["claim_case__accept_decision_desc"],"timeRange":"Past 30 days"}},{"id":"card_1765902722272","title":"unique_policies_with_claims · Past 30 days","metricId":"unique_policies_with_claims","chartType":"bar","size":"md","selection":{"dimensions":["claim_case__accept_decision_desc"],"timeRange":"Past 30 days"}}],"userId":"1071081977535114240","globalFilters":{}}
    """

    analysis = BIAnalysis.model_validate_json(json)
    pprint(analysis)
    






