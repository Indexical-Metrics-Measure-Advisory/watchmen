from typing import Optional

from pydantic import BaseModel
from pydantic_ai import Agent

from watchmen_sensing.agent.base import build_model, is_llm_configured
from watchmen_sensing.agent.formatter import render_signal
from watchmen_sensing.model.autonomous import ActionRecord
from watchmen_sensing.model.context import SignalContext
from watchmen_sensing.model.signal import Signal


class VerificationResult(BaseModel):
	resolved: bool
	reasoning: str
	confidence: float


SYSTEM_PROMPT = (
	'You are a data-operations verifier. Given a Signal, its Context and the action that '
	'was executed, decide whether the underlying issue is likely resolved. Be conservative: '
	'if the evidence does not clearly show improvement, mark it unresolved.'
)

_agent: Optional[Agent[None, VerificationResult]] = None


def _get_agent() -> Agent[None, VerificationResult]:
	global _agent
	if _agent is None:
		_agent = Agent(build_model(), result_type=VerificationResult, system_prompt=SYSTEM_PROMPT)
	return _agent


async def verify(
		signal: Signal, context: Optional[SignalContext], action: Optional[ActionRecord]
) -> Optional[VerificationResult]:
	if not is_llm_configured():
		return None
	parts = [render_signal(signal, context)]
	if action is not None:
		parts.append(f'# Executed Action\n- type: {action.actionType}\n- result: {action.result}')
	prompt = '\n'.join(parts)
	result = await _get_agent().run(prompt)
	return result.data
