import json

from enum import Enum
from typing import List, Optional, Union
from datetime import datetime

from pydantic import ConfigDict

from watchmen_model.common import UserBasedTuple, Auditable
from watchmen_utilities import ExtendedBaseModel





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


class AlertActionType(str, Enum):
    EMAIL = "email"
    WEBHOOK = "webhook"
    NOTIFICATION = "notification"
    PROCESS = "process"


class AlertCondition(ExtendedBaseModel):
    metricId: Optional[str] = None
    metricName: Optional[str] = None
    operator: Optional[AlertOperator] = None
    value: Optional[Union[float, str]] = None


class AlertAction(ExtendedBaseModel):
    type: Optional[str] = None
    riskLevel: Optional[AlertPriority] = None
    name: Optional[str] = None
    content: Optional[str] = None
    expectedEffect: Optional[str] = None
    target: Optional[str] = None
    template: Optional[str] = None


class AlertConfig(ExtendedBaseModel, UserBasedTuple, Auditable):
    enabled: bool = False
    name: Optional[str] = None
    priority: Optional[AlertPriority] = None
    description: Optional[str] = None
    conditionLogic: Optional[AlertConditionLogic] = None
    conditions: Optional[List[AlertCondition]] = None
    actions: Optional[List[AlertAction]] = None
    nextAction: Optional[AlertAction] = None
    decision: Optional[str] = None

    model_config = ConfigDict(use_enum_values=True)


class GlobalAlertRule(AlertConfig):
    id: str





class AlertSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class AlertConditionResult(ExtendedBaseModel):
    metricId: Optional[str] = None
    metricName: Optional[str] = None
    operator: Optional[AlertOperator] = None
    value: Optional[Union[float, str]] = None
    currentValue: Optional[float] = None
    triggered: bool


class AlertStatus(ExtendedBaseModel):
    id: str
    ruleId: str
    ruleName: str
    triggered: bool
    triggeredAt: Optional[datetime] = None
    severity: AlertSeverity
    message: str
    acknowledged: bool
    acknowledgedBy: Optional[str] = None
    acknowledgedAt: Optional[datetime] = None
    conditionResults: Optional[List[AlertConditionResult]] = None
