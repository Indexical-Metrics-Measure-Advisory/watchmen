from unittest import TestCase

from watchmen_sensing.common.constants import (
	EXECUTION_MODE_APPROVAL, EXECUTION_MODE_AUTO, EXECUTION_MODE_REVIEW
)
from watchmen_sensing.engine.action_engine import ActionEngine, GateDecision
from watchmen_sensing.model.autonomous import AutonomousLevel, RecommendedAction


def action(mode):
	return RecommendedAction(type='X', executionMode=mode)


class EvaluateGateTestCase(TestCase):
	"""P1-5: the gate is the single source of truth for the autonomous boundary."""

	def test_auto_within_cap_auto_executes(self):
		engine = ActionEngine(autonomous_level_cap=AutonomousLevel.AUTO_EXECUTE)
		self.assertEqual(engine.evaluate_gate(action(EXECUTION_MODE_AUTO)), GateDecision.AUTO_EXECUTE)

	def test_auto_below_cap_blocked(self):
		engine = ActionEngine(autonomous_level_cap=AutonomousLevel.OBSERVE)
		self.assertEqual(engine.evaluate_gate(action(EXECUTION_MODE_AUTO)), GateDecision.BLOCKED)

	def test_review_always_needs_review_regardless_of_cap(self):
		engine = ActionEngine(autonomous_level_cap=AutonomousLevel.AUTONOMOUS)
		self.assertEqual(engine.evaluate_gate(action(EXECUTION_MODE_REVIEW)), GateDecision.NEEDS_REVIEW)

	def test_approval_always_needs_approval_regardless_of_cap(self):
		# Even at the highest autonomous level, an approval-class action must wait.
		engine = ActionEngine(autonomous_level_cap=AutonomousLevel.AUTONOMOUS)
		self.assertEqual(engine.evaluate_gate(action(EXECUTION_MODE_APPROVAL)), GateDecision.NEEDS_APPROVAL)

	def test_should_auto_execute_consistent_with_gate(self):
		engine = ActionEngine(autonomous_level_cap=AutonomousLevel.AUTO_EXECUTE)
		self.assertTrue(engine.should_auto_execute(action(EXECUTION_MODE_AUTO)))
		self.assertFalse(engine.should_auto_execute(action(EXECUTION_MODE_REVIEW)))
		self.assertFalse(engine.should_auto_execute(action(EXECUTION_MODE_APPROVAL)))

	def test_blocked_when_cap_between_review_and_auto(self):
		# RECOMMEND(1) is below AUTO_EXECUTE(2), so an auto-class action is blocked.
		engine = ActionEngine(autonomous_level_cap=AutonomousLevel.RECOMMEND)
		self.assertEqual(engine.evaluate_gate(action(EXECUTION_MODE_AUTO)), GateDecision.BLOCKED)
