from unittest import TestCase

from watchmen_sensing.common.exception import IllegalSignalTransitionException
from watchmen_sensing.engine.signal_engine import (
	ORDERED_STATUSES, advance, assert_transition, can_transition, next_status
)
from watchmen_sensing.model.signal import SignalStatus


class NextStatusTestCase(TestCase):
	def test_detected_advances_to_enriched(self):
		self.assertEqual(next_status(SignalStatus.DETECTED), SignalStatus.ENRICHED)

	def test_each_step_advances_by_one(self):
		for i in range(len(ORDERED_STATUSES) - 1):
			self.assertEqual(next_status(ORDERED_STATUSES[i]), ORDERED_STATUSES[i + 1])

	def test_resolved_is_terminal(self):
		self.assertIsNone(next_status(SignalStatus.RESOLVED))

	def test_full_chain_length(self):
		# 9 lifecycle stages per section 28.
		self.assertEqual(len(ORDERED_STATUSES), 9)


class CanTransitionTestCase(TestCase):
	def test_forward_transition_allowed(self):
		self.assertTrue(can_transition(SignalStatus.DETECTED, SignalStatus.ENRICHED))

	def test_same_status_allowed(self):
		self.assertTrue(can_transition(SignalStatus.ACTION_PLANNED, SignalStatus.ACTION_PLANNED))

	def test_skip_forward_forbidden(self):
		# DETECTED -> CLASSIFIED skips ENRICHED -> forbidden.
		self.assertFalse(can_transition(SignalStatus.DETECTED, SignalStatus.CLASSIFIED))

	def test_backward_forbidden(self):
		self.assertFalse(can_transition(SignalStatus.ENRICHED, SignalStatus.DETECTED))

	def test_from_terminal_forbidden(self):
		self.assertFalse(can_transition(SignalStatus.RESOLVED, SignalStatus.VERIFIED))


class AssertTransitionTestCase(TestCase):
	def test_legal_does_not_raise(self):
		# Should not raise.
		assert_transition(SignalStatus.DETECTED, SignalStatus.ENRICHED)

	def test_illegal_raises(self):
		with self.assertRaises(IllegalSignalTransitionException):
			assert_transition(SignalStatus.DETECTED, SignalStatus.RESOLVED)


class AdvanceTestCase(TestCase):
	def test_advance_through_chain(self):
		self.assertEqual(
			advance(
				SignalStatus.ACTION_PLANNED,
				SignalStatus.ACTION_EXECUTED, SignalStatus.VERIFIED, SignalStatus.RESOLVED),
			SignalStatus.RESOLVED)

	def test_advance_illegal_jump_raises(self):
		with self.assertRaises(IllegalSignalTransitionException):
			advance(SignalStatus.DETECTED, SignalStatus.RESOLVED)
