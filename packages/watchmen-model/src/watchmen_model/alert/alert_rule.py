from enum import Enum
from typing import List, Optional, Any, Dict, Union

from watchmen_model.common import GlobalAlertRuleId, SuggestedActionId, TenantId, UserBasedTuple
from watchmen_utilities import ExtendedBaseModel


class AlertAction(ExtendedBaseModel):
	type: str = None
	typeName: Optional[str] = None
	suggestedActionId: Optional[SuggestedActionId] = None
	executionMode: Optional[str] = None  # 'auto' | 'manual' | 'approval'
	target: Optional[str] = None
	template: Optional[str] = None
	riskLevel: Optional[str] = None  # 'low' | 'medium' | 'high' | 'critical'
	name: Optional[str] = None
	content: Optional[str] = None
	expectedEffect: Optional[str] = None
	parameters: Optional[Dict[str, Any]] = None


class AlertCondition(ExtendedBaseModel):
	metricId: Optional[str] = None
	metricName: Optional[str] = None
	operator: str = None  # '>' | '<' | '>=' | '<=' | '==' | '!='
	value: Union[str, int, float] = None


class AlertConfig(ExtendedBaseModel):
	enabled: bool = True
	name: Optional[str] = None
	priority: Optional[str] = None  # 'high' | 'medium' | 'low' | 'critical'
	description: Optional[str] = None
	conditionLogic: Optional[str] = None  # 'and' | 'or'
	conditions: Optional[List[AlertCondition]] = None
	actions: Optional[List[AlertAction]] = None
	nextAction: Optional[AlertAction] = None
	decision: Optional[str] = None


class GlobalAlertRule(UserBasedTuple, AlertConfig):
	globalAlertRuleId: GlobalAlertRuleId = None
