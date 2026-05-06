from datetime import datetime
from enum import Enum
from typing import Optional, List

from watchmen_model.common import TenantBasedTuple, Auditable
from watchmen_utilities import ExtendedBaseModel
from .alert_rule import AlertSeverity, AlertConditionResult, AlertAction


class AcknowledgeReason(str, Enum):
    PROCESSED = "processed"
    IGNORED = "ignored"
    ESCALATED = "escalated"
    FALSE_ALARM = "false_alarm"
    MAINTENANCE = "maintenance"
    OTHER = "other"


class AlertInstance(ExtendedBaseModel, TenantBasedTuple, Auditable):
    instanceId: str = None
    ruleId: str = None
    ruleName: Optional[str] = None
    triggerTime: datetime = None
    severity: Optional[AlertSeverity] = None
    message: Optional[str] = None
    conditionResults: Optional[List[AlertConditionResult]] = None
    actions: Optional[List[AlertAction]] = None

    acknowledged: bool = False
    acknowledgedBy: Optional[str] = None
    acknowledgedAt: Optional[datetime] = None
    acknowledgeReason: Optional[AcknowledgeReason] = None

    nextTriggerTime: Optional[datetime] = None
    intervalMinutes: Optional[int] = None


class AlertAckRequest(ExtendedBaseModel):
    instanceId: str
    reason: Optional[AcknowledgeReason] = None
    intervalMinutes: Optional[int] = None