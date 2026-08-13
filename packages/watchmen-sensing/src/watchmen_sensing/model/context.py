from datetime import datetime
from typing import Any, Dict, List, Optional

from watchmen_utilities import ExtendedBaseModel

from watchmen_sensing.model.evidence import Impact


class SignalContext(ExtendedBaseModel):
	"""Context Engine output (section 3): ontology + lineage + impact + history.

	This is the compressed, LLM-friendly context that is allowed to reach the AI
	agents. Raw data never does (section 29).
	"""
	ontologySnapshot: Optional[Dict[str, Any]] = None
	lineage: Optional[Dict[str, Any]] = None
	impact: Optional[Impact] = None
	history: Optional[List[Dict[str, Any]]] = []
	relatedSignals: Optional[List[str]] = []
	fetchedAt: Optional[datetime] = None
