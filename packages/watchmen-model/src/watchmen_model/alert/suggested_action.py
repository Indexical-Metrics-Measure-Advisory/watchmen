from enum import Enum
from typing import List, Optional, Any, Dict, Union

from watchmen_model.common import SuggestedActionId, ActionTypeId, TenantId, UserBasedTuple
from watchmen_utilities import ExtendedBaseModel


class ActionExecutionMode(str, Enum):
	AUTO = 'auto'
	MANUAL = 'manual'
	APPROVAL = 'approval'


class ActionRiskLevel(str, Enum):
	LOW = 'low'
	MEDIUM = 'medium'
	HIGH = 'high'
	CRITICAL = 'critical'


class ActionPriority(str, Enum):
	LOW = 'low'
	MEDIUM = 'medium'
	HIGH = 'high'


class SuggestedActionCondition(ExtendedBaseModel):
	metricName: str = None
	operator: str = None
	value: Union[str, int, float] = None


class SuggestedAction(UserBasedTuple):
	suggestedActionId: SuggestedActionId = None
	name: str = None
	typeId: ActionTypeId = None
	riskLevel: ActionRiskLevel = None
	description: str = None
	expectedOutcome: Optional[str] = None
	conditions: List[SuggestedActionCondition] = None
	executionMode: ActionExecutionMode = None
	priority: ActionPriority = None
	enabled: bool = True

	# Stats
	executionCount: int = 0
	successRate: float = 0.0
	lastExecuted: Optional[str] = None

	parameters: Optional[Dict[str, Any]] = None
