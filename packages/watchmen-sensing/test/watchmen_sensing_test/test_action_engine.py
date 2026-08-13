from datetime import datetime
from unittest import TestCase

from watchmen_sensing.common.constants import (
	EXECUTION_MODE_APPROVAL, EXECUTION_MODE_AUTO, EXECUTION_MODE_REVIEW
)
from watchmen_sensing.engine.action_engine import ActionEngine
from watchmen_sensing.model.autonomous import (
	ActionStatus, AutonomousLevel, RecommendedAction
)
from watchmen_sensing.model.evidence import AffectedAsset
from watchmen_sensing.model.signal import Signal, SignalCategory, SignalSeverity


def make_signal(signal_type='PIPELINE_FAILURE', recommended=None):
	return Signal(
		signalId='s1',
		signalType=signal_type,
		category=SignalCategory.OPERATIONAL,
		timestamp=datetime(2026, 8, 13, 10, 0, 0),
		asset=AffectedAsset(type='PIPELINE', id='p1'),
		severity=SignalSeverity.HIGH,
		recommendedActions=recommended,
		tenantId='t1',
		userId='u1'
	)


class PlanTestCase(TestCase):
	def test_derives_actions_from_signal_type_when_none(self):
		engine = ActionEngine()
		signal = make_signal(signal_type='DATA_FRESHNESS_BREACH', recommended=None)
		actions = engine.plan(signal)
		self.assertTrue(len(actions) >= 1)
		self.assertEqual(actions[0].type, 'CHECK_PIPELINE')

	def test_applies_policy_to_existing_actions(self):
		engine = ActionEngine()
		raw = [RecommendedAction(type='RETRY')]
		signal = make_signal(recommended=raw)
		actions = engine.plan(signal)
		self.assertEqual(len(actions), 1)
		# RETRY -> low risk, auto execution.
		self.assertEqual(actions[0].riskLevel, 'low')
		self.assertEqual(actions[0].executionMode, EXECUTION_MODE_AUTO)

	def test_high_risk_action_gets_approval_mode(self):
		engine = ActionEngine()
		raw = [RecommendedAction(type='UPDATE_PIPELINE')]
		signal = make_signal(recommended=raw)
		actions = engine.plan(signal)
		self.assertEqual(actions[0].riskLevel, 'high')
		self.assertEqual(actions[0].executionMode, EXECUTION_MODE_APPROVAL)

	def test_block_pipeline_is_critical_and_approval(self):
		engine = ActionEngine()
		raw = [RecommendedAction(type='BLOCK_PIPELINE')]
		signal = make_signal(recommended=raw)
		actions = engine.plan(signal)
		self.assertEqual(actions[0].riskLevel, 'critical')
		self.assertEqual(actions[0].executionMode, EXECUTION_MODE_APPROVAL)

	def test_unknown_action_defaults_to_medium_review(self):
		engine = ActionEngine()
		raw = [RecommendedAction(type='SOMETHING_NEW')]
		signal = make_signal(recommended=raw)
		actions = engine.plan(signal)
		self.assertEqual(actions[0].riskLevel, 'medium')
		self.assertEqual(actions[0].executionMode, EXECUTION_MODE_REVIEW)


class ApplyPolicyTestCase(TestCase):
	def test_apply_policy_overrides_model_supplied_mode(self):
		engine = ActionEngine()
		# An AI-proposed type must be re-mapped through the policy so a model-chosen
		# execution mode can never bypass the risk boundary.
		action = RecommendedAction(type='BLOCK_PIPELINE', executionMode=EXECUTION_MODE_AUTO, riskLevel='low')
		applied = engine.apply_policy(action)
		self.assertEqual(applied.riskLevel, 'critical')
		self.assertEqual(applied.executionMode, EXECUTION_MODE_APPROVAL)


class ShouldAutoExecuteTestCase(TestCase):
	def test_auto_mode_with_high_cap(self):
		engine = ActionEngine(autonomous_level_cap=AutonomousLevel.AUTO_EXECUTE)
		action = RecommendedAction(type='RETRY', executionMode=EXECUTION_MODE_AUTO)
		self.assertTrue(engine.should_auto_execute(action))

	def test_auto_mode_with_observe_cap(self):
		engine = ActionEngine(autonomous_level_cap=AutonomousLevel.OBSERVE)
		action = RecommendedAction(type='RETRY', executionMode=EXECUTION_MODE_AUTO)
		self.assertFalse(engine.should_auto_execute(action))

	def test_review_mode_never_auto(self):
		engine = ActionEngine(autonomous_level_cap=AutonomousLevel.AUTONOMOUS)
		action = RecommendedAction(type='CHECK_PIPELINE', executionMode=EXECUTION_MODE_REVIEW)
		self.assertFalse(engine.should_auto_execute(action))

	def test_approval_mode_never_auto(self):
		engine = ActionEngine(autonomous_level_cap=AutonomousLevel.AUTONOMOUS)
		action = RecommendedAction(type='UPDATE_PIPELINE', executionMode=EXECUTION_MODE_APPROVAL)
		self.assertFalse(engine.should_auto_execute(action))


class ApprovalRequiredTestCase(TestCase):
	def test_approval_mode_requires_approval(self):
		engine = ActionEngine()
		action = RecommendedAction(type='UPDATE_PIPELINE', executionMode=EXECUTION_MODE_APPROVAL)
		self.assertTrue(engine.is_approval_required(action))

	def test_auto_mode_does_not_require_approval(self):
		engine = ActionEngine()
		action = RecommendedAction(type='RETRY', executionMode=EXECUTION_MODE_AUTO)
		self.assertFalse(engine.is_approval_required(action))


class ToRecordTestCase(TestCase):
	def test_record_inherits_signal_fields(self):
		engine = ActionEngine()
		signal = make_signal()
		action = RecommendedAction(type='RETRY')
		record = engine.to_record(signal, action)
		self.assertEqual(record.signalId, signal.signalId)
		self.assertEqual(record.actionType, 'RETRY')
		self.assertEqual(record.status, ActionStatus.PROPOSED)
		self.assertEqual(record.tenantId, signal.tenantId)
