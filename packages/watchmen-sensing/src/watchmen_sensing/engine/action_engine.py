from enum import Enum
from typing import List

from watchmen_sensing.common.constants import (
	EXECUTION_MODE_APPROVAL, EXECUTION_MODE_AUTO, EXECUTION_MODE_REVIEW, RISK_CRITICAL,
	RISK_HIGH, RISK_LOW, RISK_MEDIUM, SIGNAL_COLLECTOR_TABLE_CHANGED,
	SIGNAL_DATA_CONTRACT_VIOLATION, SIGNAL_DATA_DRIFT_DETECTED, SIGNAL_DATA_FRESHNESS_BREACH,
	SIGNAL_DATA_PROFILE_READY, SIGNAL_DATA_QUALITY_DEGRADED, SIGNAL_METRIC_ANOMALY,
	SIGNAL_PIPELINE_FAILURE, SIGNAL_PIPELINE_PERFORMANCE_DEGRADED,
	SIGNAL_SCHEMA_BASELINE_ESTABLISHED, SIGNAL_SCHEMA_CHANGED,
	SIGNAL_SCHEMA_REFLECTION_FAILED, SIGNAL_SEMANTIC_MAPPING_CANDIDATE,
	SIGNAL_SOURCE_DISCOVERED, SIGNAL_TOPIC_DEFINITION_CHANGED
)
from watchmen_sensing.model.autonomous import (
	ActionRecord, ActionStatus, AutonomousLevel, RecommendedAction
)
from watchmen_sensing.model.signal import Signal


class GateDecision(str, Enum):
	"""The single, centrally-enforced autonomous gate verdict for an action.

	Every action execution path must consult :meth:`ActionEngine.evaluate_gate`
	so the risk/approval boundary is auditable in one place (section 32/33).
	"""
	AUTO_EXECUTE = 'auto_execute'       # safe + within autonomous cap -> may run
	NEEDS_REVIEW = 'needs_review'       # human should look, but no hard block
	NEEDS_APPROVAL = 'needs_approval'   # high-risk write -> must be approved first
	BLOCKED = 'blocked'                 # auto-class but cap too low to auto-run


# Section 31 — signal type to candidate actions.
SIGNAL_TYPE_ACTIONS = {
	SIGNAL_SCHEMA_CHANGED: ['UPDATE_MAPPING', 'UPDATE_PIPELINE'],
	SIGNAL_SCHEMA_REFLECTION_FAILED: ['INVESTIGATE_SOURCE'],
	SIGNAL_TOPIC_DEFINITION_CHANGED: ['INVESTIGATE_SOURCE'],
	SIGNAL_COLLECTOR_TABLE_CHANGED: ['INVESTIGATE_SOURCE'],
	SIGNAL_SCHEMA_BASELINE_ESTABLISHED: ['INVESTIGATE_SOURCE'],
	SIGNAL_PIPELINE_FAILURE: ['RETRY', 'INVESTIGATE_PIPELINE'],
	SIGNAL_DATA_FRESHNESS_BREACH: ['CHECK_PIPELINE'],
	SIGNAL_DATA_QUALITY_DEGRADED: ['REPROCESS_DATA', 'INVESTIGATE_SOURCE'],
	SIGNAL_DATA_PROFILE_READY: [],
	SIGNAL_DATA_DRIFT_DETECTED: ['INVESTIGATE_SOURCE'],
	SIGNAL_SEMANTIC_MAPPING_CANDIDATE: ['CREATE_MAPPING'],
	SIGNAL_SOURCE_DISCOVERED: ['ONBOARD_SOURCE'],
	SIGNAL_DATA_CONTRACT_VIOLATION: ['BLOCK_PIPELINE'],
	SIGNAL_PIPELINE_PERFORMANCE_DEGRADED: ['OPTIMIZE_PIPELINE'],
	SIGNAL_METRIC_ANOMALY: ['ROOT_CAUSE_ANALYSIS'],
}

# Section 33 — action type to (riskLevel, executionMode). High-risk write
# operations always require approval regardless of the autonomous level cap.
ACTION_POLICY = {
	'RETRY': (RISK_LOW, EXECUTION_MODE_AUTO),
	'REPROCESS_DATA': (RISK_LOW, EXECUTION_MODE_AUTO),
	'OPTIMIZE_PIPELINE': (RISK_MEDIUM, EXECUTION_MODE_REVIEW),
	'CHECK_PIPELINE': (RISK_LOW, EXECUTION_MODE_REVIEW),
	'INVESTIGATE_SOURCE': (RISK_LOW, EXECUTION_MODE_REVIEW),
	'INVESTIGATE_PIPELINE': (RISK_LOW, EXECUTION_MODE_REVIEW),
	'ROOT_CAUSE_ANALYSIS': (RISK_LOW, EXECUTION_MODE_REVIEW),
	'CREATE_MAPPING': (RISK_LOW, EXECUTION_MODE_REVIEW),
	'ONBOARD_SOURCE': (RISK_MEDIUM, EXECUTION_MODE_REVIEW),
	'UPDATE_MAPPING': (RISK_MEDIUM, EXECUTION_MODE_REVIEW),
	'UPDATE_PIPELINE': (RISK_HIGH, EXECUTION_MODE_APPROVAL),
	'BLOCK_PIPELINE': (RISK_CRITICAL, EXECUTION_MODE_APPROVAL),
}


class ActionEngine:
	"""Plans recommended actions from signals and applies risk gates (section 31/33).

	The autonomous level cap (from settings) bounds what may run automatically;
	approval-class actions always wait for a human regardless of the cap.
	"""

	def __init__(self, autonomous_level_cap: int = AutonomousLevel.RECOMMEND):
		self.cap = autonomous_level_cap

	def plan(self, signal: Signal) -> List[RecommendedAction]:
		raw = list(signal.recommendedActions or [])
		if not raw:
			types = SIGNAL_TYPE_ACTIONS.get(signal.signalType, ['INVESTIGATE_SOURCE'])
			raw = [RecommendedAction(type=t) for t in types]
		return [self.apply_policy(action) for action in raw]

	def apply_policy(self, action: RecommendedAction) -> RecommendedAction:
		"""Re-derive riskLevel / executionMode from ACTION_POLICY by action type.

		Public so every producer of RecommendedAction (including AI-planned ones)
		passes through the same boundary instead of trusting its own risk/mode.
		"""
		risk, mode = ACTION_POLICY.get(action.type, (RISK_MEDIUM, EXECUTION_MODE_REVIEW))
		return RecommendedAction(
			type=action.type,
			autonomousLevel=action.autonomousLevel,
			riskLevel=risk,
			executionMode=mode,
			status=action.status
		)

	def should_auto_execute(self, action: RecommendedAction) -> bool:
		return self.evaluate_gate(action) == GateDecision.AUTO_EXECUTE

	def evaluate_gate(self, action: RecommendedAction) -> GateDecision:
		"""Single source of truth for the autonomous gate (section 32/33).

		Mirrors and supersedes the scattered inline checks. Callers should branch
		on this verdict rather than re-deriving risk/approval logic locally.
		"""
		if action.executionMode == EXECUTION_MODE_APPROVAL:
			return GateDecision.NEEDS_APPROVAL
		if action.executionMode == EXECUTION_MODE_REVIEW:
			return GateDecision.NEEDS_REVIEW
		# EXECUTION_MODE_AUTO from here on.
		if self.cap >= AutonomousLevel.AUTO_EXECUTE:
			return GateDecision.AUTO_EXECUTE
		return GateDecision.BLOCKED

	def to_record(self, signal: Signal, action: RecommendedAction) -> ActionRecord:
		return ActionRecord(
			signalId=signal.signalId,
			actionType=action.type,
			autonomousLevel=action.autonomousLevel,
			riskLevel=action.riskLevel,
			executionMode=action.executionMode,
			status=ActionStatus.PROPOSED,
			tenantId=signal.tenantId,
			userId=signal.userId,
		)

	def is_approval_required(self, action: RecommendedAction) -> bool:
		return action.executionMode == EXECUTION_MODE_APPROVAL
