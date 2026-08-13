from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional

from watchmen_model.common import Auditable, UserBasedTuple
from watchmen_utilities import ExtendedBaseModel

from watchmen_sensing.common.constants import EXECUTION_MODE_REVIEW, RISK_LOW


class AutonomousLevel(int, Enum):
	"""Autonomous level of the system (section 32)."""
	OBSERVE = 0
	RECOMMEND = 1
	AUTO_EXECUTE = 2
	AUTONOMOUS = 3


class ActionStatus(str, Enum):
	PROPOSED = 'proposed'
	APPROVED = 'approved'
	EXECUTING = 'executing'
	EXECUTED = 'executed'
	VERIFIED = 'verified'
	FAILED = 'failed'
	REJECTED = 'rejected'


class RecommendedAction(ExtendedBaseModel):
	"""A recommended action attached to a signal (section 31)."""
	type: str
	autonomousLevel: AutonomousLevel = AutonomousLevel.OBSERVE
	riskLevel: str = RISK_LOW
	executionMode: str = EXECUTION_MODE_REVIEW
	status: ActionStatus = ActionStatus.PROPOSED


class ActionRecord(ExtendedBaseModel, UserBasedTuple, Auditable):
	"""A persisted, governable record of a recommended action being taken."""
	actionId: Optional[str] = None
	signalId: str
	actionType: str
	autonomousLevel: AutonomousLevel = AutonomousLevel.OBSERVE
	riskLevel: str = RISK_LOW
	executionMode: str = EXECUTION_MODE_REVIEW
	status: ActionStatus = ActionStatus.PROPOSED
	payload: Optional[Dict[str, Any]] = {}
	result: Optional[str] = None
	approvedBy: Optional[str] = None
	approvedAt: Optional[datetime] = None
	executedAt: Optional[datetime] = None
