from unittest import TestCase

from watchmen_sensing.common.constants import EXECUTION_MODE_AUTO, EXECUTION_MODE_REVIEW
from watchmen_sensing.engine.feedback_engine import FeedbackEngine
from watchmen_sensing.model.autonomous import ActionRecord


def make_record(action_type, execution_mode):
	return ActionRecord(signalId='s1', actionType=action_type, executionMode=execution_mode)


class LikelyResolvedTestCase(TestCase):
	def setUp(self):
		self.engine = FeedbackEngine()

	def test_retry_auto_likely_resolved(self):
		self.assertTrue(self.engine.likely_resolved(make_record('RETRY', EXECUTION_MODE_AUTO)))

	def test_reprocess_auto_likely_resolved(self):
		self.assertTrue(self.engine.likely_resolved(make_record('REPROCESS_DATA', EXECUTION_MODE_AUTO)))

	def test_retry_review_not_auto_resolved(self):
		self.assertFalse(self.engine.likely_resolved(make_record('RETRY', EXECUTION_MODE_REVIEW)))

	def test_unknown_action_auto_not_resolved(self):
		self.assertFalse(self.engine.likely_resolved(make_record('UPDATE_PIPELINE', EXECUTION_MODE_AUTO)))
