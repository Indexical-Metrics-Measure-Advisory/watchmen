"""Render a Signal + SignalContext into a compressed prompt for the AI agents.

Only compressed evidence reaches here (section 29) — never raw rows.
"""

import json
from typing import Optional

from watchmen_sensing.model.context import SignalContext
from watchmen_sensing.model.signal import Signal


def _trim(value, limit: int = 2000) -> str:
	if value is None:
		return ''
	if isinstance(value, (dict, list)):
		text = json.dumps(value, default=str, ensure_ascii=False)
	else:
		text = str(value)
	return text if len(text) <= limit else text[:limit] + '...<trimmed>'


def render_signal(signal: Signal, context: Optional[SignalContext] = None) -> str:
	lines = [
		'# Signal',
		f'- type: {signal.signalType}',
		f'- category: {signal.category}',
		f'- severity: {signal.severity}',
		f'- confidence: {signal.confidence}',
		f'- asset: {_trim(signal.asset.model_dump() if signal.asset else None)}',
		f'- ontology: {_trim(signal.ontology.model_dump() if signal.ontology else None)}',
		f'- evidence: {_trim(signal.evidence.model_dump() if signal.evidence else None)}',
		f'- impact: {_trim(signal.impact.model_dump() if signal.impact else None)}',
	]
	if context is not None:
		lines.append('# Context')
		lines.append(f'- ontologySnapshot: {_trim(context.ontologySnapshot)}')
		lines.append(f'- lineage: {_trim(context.lineage)}')
		lines.append(f'- impact: {_trim(context.impact.model_dump() if context.impact else None)}')
		lines.append(f'- history: {_trim(context.history)}')
	return '\n'.join(lines)
