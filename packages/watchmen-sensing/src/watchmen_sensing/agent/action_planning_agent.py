from typing import Optional

from pydantic import BaseModel
from pydantic_ai import Agent

from watchmen_sensing.agent.base import build_model, is_llm_configured
from watchmen_sensing.agent.formatter import render_signal
from watchmen_sensing.model.context import SignalContext
from watchmen_sensing.model.signal import Signal


class PlannedAction(BaseModel):
	action_type: str
	risk_level: str  # low / medium / high / critical
	execution_mode: str  # auto / review / approval
	rationale: str


class ActionPlanningResult(BaseModel):
	actions: list[PlannedAction]
	overall_confidence: float


SYSTEM_PROMPT = (
	'You are a data-operations planner. Given a Signal and its Context, propose a small, '
	'ordered set of remediation actions. For each action choose a risk level and an '
	'execution mode (auto for safe idempotent fixes, review for risky ones, approval for '
	'write-side / production changes). Ground the rationale in the provided evidence.'
)

_agent: Optional[Agent[None, ActionPlanningResult]] = None


def _get_agent() -> Agent[None, ActionPlanningResult]:
	global _agent
	if _agent is None:
		_agent = Agent(build_model(), result_type=ActionPlanningResult, system_prompt=SYSTEM_PROMPT)
	return _agent


async def plan(signal: Signal, context: Optional[SignalContext] = None) -> Optional[ActionPlanningResult]:
	if not is_llm_configured():
		return None
	prompt = render_signal(signal, context)
	result = await _get_agent().run(prompt)
	return result.data
