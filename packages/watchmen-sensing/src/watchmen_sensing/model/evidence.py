from typing import Any, Dict, List, Optional

from watchmen_utilities import ExtendedBaseModel


class AffectedAsset(ExtendedBaseModel):
	"""The asset a signal is about (section 27)."""
	type: str
	id: str


class OntologyRef(ExtendedBaseModel):
	"""Anchors a signal to the ontology world model."""
	ontologyId: Optional[str] = None
	object: Optional[str] = None
	property: Optional[str] = None


class Evidence(ExtendedBaseModel):
	"""Compressed, LLM-friendly evidence. Never raw rows (section 29)."""
	metrics: Optional[Dict[str, Any]] = {}
	expected: Optional[Any] = None
	actual: Optional[Any] = None
	notes: Optional[str] = None


class Impact(ExtendedBaseModel):
	"""What is affected by the signal."""
	dataProducts: Optional[List[str]] = []
	metrics: Optional[List[str]] = []
	ontologyObjects: Optional[List[str]] = []
	pipelines: Optional[List[str]] = []
