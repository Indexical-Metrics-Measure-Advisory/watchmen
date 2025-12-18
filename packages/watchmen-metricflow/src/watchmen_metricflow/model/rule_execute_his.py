from datetime import datetime
from typing import Optional, List, Dict, Any

from watchmen_model.common import TenantBasedTuple, Auditable
from watchmen_utilities import ExtendedBaseModel
from .alert_rule import AlertSeverity, AlertConditionResult


class AlertRuleExecutionHistory(ExtendedBaseModel, TenantBasedTuple, Auditable):
    historyId: str = None
    ruleId: str = None
    triggerTime: datetime = None
    conditionResult: Optional[List[AlertConditionResult]] = None
    severity: Optional[AlertSeverity] = None
    
    # Acknowledgment info
    acknowledged: bool = False
    acknowledgeTime: Optional[datetime] = None
    acknowledgeReason: Optional[str] = None
    
    # Next action execution info
    nextActionExecuted: bool = False
    nextActionTime: Optional[datetime] = None
    nextActionResult: Optional[Dict[str, Any]] = None
