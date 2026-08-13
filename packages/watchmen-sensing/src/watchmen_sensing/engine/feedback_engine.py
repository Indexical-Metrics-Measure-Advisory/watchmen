from watchmen_sensing.common.constants import EXECUTION_MODE_AUTO
from watchmen_sensing.model.autonomous import ActionRecord


class FeedbackEngine:
	"""Post-action verification hook (section "Verify" in the loop).

	MVP: low-risk auto actions (RETRY / REPROCESS_DATA) are optimistically marked
	as resolved-after-execution; everything else is left for the verification AI
	agent and/or a human. Real closed-loop verification (re-sensing the asset and
	comparing) is layered in later — this hook is where it plugs in.
	"""

	def likely_resolved(self, record: ActionRecord) -> bool:
		if record.executionMode != EXECUTION_MODE_AUTO:
			return False
		return record.actionType in ('RETRY', 'REPROCESS_DATA')
