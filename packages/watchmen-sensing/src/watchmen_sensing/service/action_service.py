from logging import getLogger
from typing import List

from watchmen_indicator_surface.util import trans
from watchmen_utilities import get_current_time_in_seconds

from watchmen_sensing.common.exception import (
	ActionNotApprovedException, ActionNotFoundException
)
from watchmen_sensing.engine.action_engine import ActionEngine, GateDecision
from watchmen_sensing.engine.feedback_engine import FeedbackEngine
from watchmen_sensing.meta.action_record_service import ActionRecordService
from watchmen_sensing.meta.signal_service import SignalService
from watchmen_sensing.model.autonomous import (
	ActionRecord, ActionStatus, AutonomousLevel, RecommendedAction
)
from watchmen_sensing.model.signal import SignalStatus

logger = getLogger(__name__)


class ActionService:
	"""Human-in-the-loop approve / execute / verify for recommended actions."""

	def __init__(
			self, action_record_service: ActionRecordService, signal_service: SignalService,
			autonomous_level_cap: int = AutonomousLevel.RECOMMEND
	):
		self.action_record_service = action_record_service
		self.signal_service = signal_service
		self.feedback_engine = FeedbackEngine()
		self.action_engine = ActionEngine(autonomous_level_cap)

	def find_pending(self, tenant_id: str) -> List[ActionRecord]:
		return trans(self.action_record_service, lambda: self.action_record_service.find_pending(tenant_id))

	def find_by_signal(self, signal_id: str, tenant_id: str) -> List[ActionRecord]:
		return trans(
			self.action_record_service,
			lambda: self.action_record_service.find_by_signal(signal_id, tenant_id))

	def approve(self, action_id: str, tenant_id: str = None) -> ActionRecord:
		record = trans(
			self.action_record_service,
			lambda: self.action_record_service.find_by_id(action_id, tenant_id))
		if record is None:
			raise ActionNotFoundException(f'Action[{action_id}] not found.')
		record.status = ActionStatus.APPROVED
		record.approvedBy = self.action_record_service.principalService.get_user_id()
		record.approvedAt = get_current_time_in_seconds()
		return trans(self.action_record_service, lambda: self.action_record_service.update(record))

	def _gate_for(self, record: ActionRecord) -> GateDecision:
		"""Evaluate the central autonomous gate for a persisted action record."""
		return self.action_engine.evaluate_gate(RecommendedAction(
			type=record.actionType,
			autonomousLevel=record.autonomousLevel,
			riskLevel=record.riskLevel,
			executionMode=record.executionMode
		))

	async def execute(self, action_id: str, tenant_id: str = None) -> ActionRecord:
		record = trans(
			self.action_record_service,
			lambda: self.action_record_service.find_by_id(action_id, tenant_id))
		if record is None:
			raise ActionNotFoundException(f'Action[{action_id}] not found.')

		# Central gate (section 32/33). The approval hard-block is enforced here,
		# in one place, for every execution path.
		decision = self._gate_for(record)
		logger.info(
			'gate decision actionId=%s type=%s risk=%s mode=%s -> %s',
			action_id, record.actionType, record.riskLevel, record.executionMode, decision.value
		)
		if decision == GateDecision.NEEDS_APPROVAL and record.status != ActionStatus.APPROVED:
			raise ActionNotApprovedException(
				f'Action[{action_id}] requires approval before execution.')
		if decision == GateDecision.BLOCKED:
			raise ActionNotApprovedException(
				f'Action[{action_id}] blocked: autonomous cap too low for auto execution.')

		# MVP placeholder execution: real dispatch (retry pipeline / reprocess / ...)
		# plugs in here per action type.
		record.status = ActionStatus.EXECUTING
		trans(self.action_record_service, lambda: self.action_record_service.update(record))
		record.status = ActionStatus.EXECUTED
		record.executedAt = get_current_time_in_seconds()
		record.result = record.result or 'executed (mvp placeholder)'
		trans(self.action_record_service, lambda: self.action_record_service.update(record))

		await self._verify(record)
		return record

	async def _verify(self, record: ActionRecord) -> None:
		from watchmen_sensing.agent import verification_agent
		from watchmen_sensing.engine.signal_engine import advance

		signal = trans(
			self.signal_service,
			lambda: self.signal_service.find_by_id(record.signalId, record.tenantId))
		if signal is None:
			return
		# Idempotent guard: a signal already advanced past execution needs no further
		# transition (re-executing an already-verified action is a no-op).
		if signal.status in (SignalStatus.VERIFIED, SignalStatus.RESOLVED):
			return

		resolved = self.feedback_engine.likely_resolved(record)
		verification = await verification_agent.verify(signal, signal.context, record)
		if verification is not None:
			resolved = bool(verification.resolved)

		if resolved:
			signal.status = advance(
				signal.status, SignalStatus.ACTION_EXECUTED, SignalStatus.VERIFIED, SignalStatus.RESOLVED)
		else:
			signal.status = advance(
				signal.status, SignalStatus.ACTION_EXECUTED, SignalStatus.VERIFIED)
		trans(self.signal_service, lambda: self.signal_service.update(signal))
