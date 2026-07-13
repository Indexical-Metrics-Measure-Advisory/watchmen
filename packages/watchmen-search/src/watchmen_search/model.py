"""Generic document/search models for the watchmen-search package.

These are the generalized, business-agnostic counterparts to the original
``ChallengeDocument`` / ``VectorSearchResult`` models that lived inside
``watchmen-ai-copilot/hypothesis/rag``. They carry no hypothesis-specific
fields (``simulation_id``, ``challenge_title``, ``markdown_content`` ...),
only ``id`` / ``text`` / ``metadata`` / ``embedding``.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class SearchDocument(BaseModel):
	"""A unit of text to be indexed for semantic search.

	``metadata`` is a free-form dict (e.g. ``{"topicId": ..., "factorId": ...}``)
	that callers use to filter/delete documents by. It is serialized to a JSON
	string column in the backing vector store.
	"""

	id: str
	text: str
	metadata: Dict[str, Any] = Field(default_factory=dict)
	embedding: Optional[List[float]] = None
	created_at: Optional[datetime] = None

	def effective_created_at(self) -> datetime:
		return self.created_at if self.created_at is not None else datetime.now()


class SearchResult(BaseModel):
	"""One hit returned by ``SemanticSearchService.search``.

	``score`` is normalized to the range ``[0.0, 1.0]`` (1.0 = most similar),
	regardless of the underlying distance metric used by the vector store.
	"""

	document: SearchDocument
	score: float
