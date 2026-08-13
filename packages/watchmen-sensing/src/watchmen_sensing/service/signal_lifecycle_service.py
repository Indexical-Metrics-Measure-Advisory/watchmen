from typing import List

from watchmen_indicator_surface.util import trans
from watchmen_utilities import get_current_time_in_seconds

from watchmen_sensing.adapter import AdapterBundle
from watchmen_sensing.engine.action_engine import ActionEngine
from watchmen_sensing.engine.context_engine import ContextEngine
from watchmen_sensing.engine.feedback_engine import FeedbackEngine
from watchmen_sensing.engine.signal_engine import advance, assert_transition
from watchmen_sensing.meta.action_record_service import ActionRecordService
from watchmen_sensing.meta.signal_service import SignalService
from watchmen_sensing.model.autonomous import (
	ActionRecord, ActionStatus, RecommendedAction
)
from watchmen_sensing.model.signal import Signal, SignalStatus


class SignalLifecycleService:
	"""Drives a signal through its lifecycle (section 28), invoking the context
	engine, the pydantic-ai agents and the action engine along the way.

	DB writes happen in small transactions around each step; LLM calls are always
	made outside of any open transaction.
	"""

	def __init__(
			self, signal_service: SignalService, action_record_service: ActionRecordService,
			adapters: AdapterBundle, autonomous_level_cap: int
	):
		self.signal_service = signal_service
		self.action_record_service = action_record_service
		self.adapters = adapters
		self.context_engine = ContextEngine(adapters)
		self.action_engine = ActionEngine(autonomous_level_cap)
		self.feedback_engine = FeedbackEngine()

	# ---- low-level persistence helpers -----------------------------------

	def _save(self, signal: Signal) -> Signal:
		return trans(self.signal_service, lambda: self.signal_service.update(signal))

	def _transition(self, signal: Signal, target: SignalStatus) -> None:
		"""Validate the lifecycle transition then set the new status.

		Central guard so an illegal jump (e.g. DETECTED -> ACTION_EXECUTED) is
		rejected at the only place status changes, instead of each stage ad-hoc.
		"""
		assert_transition(signal.status, target)
		signal.status = target

	def _create_record(self, record: ActionRecord) -> ActionRecord:
		if record.actionId is None:
			record.actionId = str(self.action_record_service.snowflakeGenerator.next_id())
		if not record.tenantId:
			record.tenantId = self.signal_service.principalService.get_tenant_id()
		if not record.userId:
			record.userId = self.signal_service.principalService.get_user_id()
		return trans(self.action_record_service, lambda: self.action_record_service.create(record))

	def _update_record(self, record: ActionRecord) -> ActionRecord:
		return trans(self.action_record_service, lambda: self.action_record_service.update(record))

	# ---- lifecycle stages ------------------------------------------------

	def enrich(self, signal: Signal) -> Signal:
		context = trans(
			self.signal_service,
			lambda: self.context_engine.build(signal, self.signal_service))
		signal.context = context
		self._transition(signal, SignalStatus.ENRICHED)
		return self._save(signal)

	def classify(self, signal: Signal) -> Signal:
		# MVP: classification is severity-driven by the sensor; nothing to escalate yet.
		self._transition(signal, SignalStatus.CLASSIFIED)
		return self._save(signal)

	def correlate(self, signal: Signal) -> Signal:
		# MVP correlation: same-asset history is already in context.relatedSignals-ish.
		self._transition(signal, SignalStatus.CORRELATED)
		return self._save(signal)

	async def analyze_impact(self, signal: Signal) -> Signal:
		# Lazy import keeps pydantic-ai out of the module-load path.
		from watchmen_sensing.agent import impact_reasoning_agent, root_cause_agent

		root_cause = await root_cause_agent.analyze(signal, signal.context)
		if root_cause is not None:
			signal.rootCause = root_cause.root_cause
			signal.confidence = max(signal.confidence, float(root_cause.confidence))

		impact_result = await impact_reasoning_agent.analyze(signal, signal.context)
		if impact_result is not None and signal.context is not None:
			from watchmen_sensing.model.evidence import Impact
			signal.context.impact = Impact(
				dataProducts=impact_result.affected_data_products,
				metrics=impact_result.affected_metrics,
				ontologyObjects=impact_result.affected_ontology_objects
			)

		self._transition(signal, SignalStatus.IMPACT_ANALYZED)
		return self._save(signal)

	async def plan_action(self, signal: Signal) -> Signal:
		from watchmen_sensing.agent import action_planning_agent

		# Start from the policy-gated actions derived from the signal, then augment
		# with AI-planned actions when the LLM is configured.
		actions: List[RecommendedAction] = self.action_engine.plan(signal)
		planned = await action_planning_agent.plan(signal, signal.context)
		if planned is not None:
			for item in (planned.actions or []):
				# Re-map the AI-proposed action type through the same policy so a
				# model-chosen execution mode can never bypass the risk boundary.
				actions.append(self.action_engine.apply_policy(RecommendedAction(type=item.action_type)))
		signal.recommendedActions = actions

		# Materialise action records and auto-execute the safe ones.
		auto_records: List[ActionRecord] = []
		has_pending = False
		for action in actions:
			record = self.action_engine.to_record(signal, action)
			if self.action_engine.should_auto_execute(action):
				record.status = ActionStatus.EXECUTED
				record.executedAt = get_current_time_in_seconds()
				record.result = 'auto-executed (mvp placeholder)'
				self._create_record(record)
				auto_records.append(record)
			else:
				self._create_record(record)
				has_pending = True

		self._transition(signal, SignalStatus.ACTION_PLANNED)
		signal = self._save(signal)

		# When every action was auto-executed (nothing waits for a human), advance the
		# signal through the closed loop so auto-fixed issues don't stay open forever.
		if not has_pending and auto_records:
			resolved = all(self.feedback_engine.likely_resolved(r) for r in auto_records)
			signal = self._advance_after_execution(signal, resolved)
		return signal

	def _advance_after_execution(self, signal: Signal, resolved: bool) -> Signal:
		"""Advance a signal past execution, guarded by the lifecycle state machine."""
		if resolved:
			signal.status = advance(
				signal.status, SignalStatus.ACTION_EXECUTED, SignalStatus.VERIFIED, SignalStatus.RESOLVED)
		else:
			signal.status = advance(
				signal.status, SignalStatus.ACTION_EXECUTED, SignalStatus.VERIFIED)
		return self._save(signal)

	async def run_pipeline(self, signal: Signal) -> Signal:
		"""Run a freshly detected signal forward until it is action-planned."""
		signal = self.enrich(signal)
		signal = self.classify(signal)
		signal = self.correlate(signal)
		signal = await self.analyze_impact(signal)
		signal = await self.plan_action(signal)
		return signal
