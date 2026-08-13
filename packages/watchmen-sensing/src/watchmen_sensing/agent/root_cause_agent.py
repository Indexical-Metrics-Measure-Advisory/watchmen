from typing import Optional

from pydantic import BaseModel
from pydantic_ai import Agent

from watchmen_sensing.agent.base import build_model, is_llm_configured
from watchmen_sensing.agent.formatter import render_signal
from watchmen_sensing.model.context import SignalContext
from watchmen_sensing.model.signal import Signal


class RootCauseResult(BaseModel):
	root_cause: str
	contributing_factors: list[str]
	confidence: float


SYSTEM_PROMPT = (
	'You are a data-observability root-cause analyst. Given a structured Signal and '
	'its compressed Context (ontology snapshot, lineage, impact, history), reason about '
	'the most likely root cause. Never assume access to raw rows. Be concise and ground '
	'every claim in the provided evidence; if evidence is insufficient, say so.'
)

_agent: Optional[Agent[None, RootCauseResult]] = None


def _get_agent() -> Agent[None, RootCauseResult]:
	global _agent
	if _agent is None:
		_agent = Agent(build_model(), result_type=RootCauseResult, system_prompt=SYSTEM_PROMPT)
	return _agent


async def analyze(signal: Signal, context: Optional[SignalContext] = None) -> Optional[RootCauseResult]:
	"""Run root-cause analysis over a signal. Returns None if the LLM is off."""
	if not is_llm_configured():
		return None
	prompt = render_signal(signal, context)
	result = await _get_agent().run(prompt)
	return result.data
