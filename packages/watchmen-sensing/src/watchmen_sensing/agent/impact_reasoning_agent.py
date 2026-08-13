from typing import Optional

from pydantic import BaseModel
from pydantic_ai import Agent

from watchmen_sensing.agent.base import build_model, is_llm_configured
from watchmen_sensing.agent.formatter import render_signal
from watchmen_sensing.model.context import SignalContext
from watchmen_sensing.model.signal import Signal


class ImpactReasoningResult(BaseModel):
	affected_data_products: list[str] = []
	affected_metrics: list[str] = []
	affected_ontology_objects: list[str] = []
	blast_radius: str
	confidence: float


SYSTEM_PROMPT = (
	'You are a data-impact analyst. Given a Signal and its compressed Context, project '
	'the downstream blast radius: which data products, metrics and ontology objects are '
	'likely affected. Only use the lineage, ontology snapshot and impact hints provided.'
)

_agent: Optional[Agent[None, ImpactReasoningResult]] = None


def _get_agent() -> Agent[None, ImpactReasoningResult]:
	global _agent
	if _agent is None:
		_agent = Agent(build_model(), result_type=ImpactReasoningResult, system_prompt=SYSTEM_PROMPT)
	return _agent


async def analyze(signal: Signal, context: Optional[SignalContext] = None) -> Optional[ImpactReasoningResult]:
	if not is_llm_configured():
		return None
	prompt = render_signal(signal, context)
	result = await _get_agent().run(prompt)
	return result.data
