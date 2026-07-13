"""Abstract vector-store interface.

A :class:`VectorStore` is a thin CRUD wrapper over an external vector database
(LanceDB, pgvector, ...). It deliberately operates on already-computed vectors
— the embedding step is the responsibility of
:class:`~watchmen_search.semantic_search.SemanticSearchService`, which composes
a provider with a store. This keeps stores swappable without re-implementing
embedding logic.
"""
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

from .model import SearchDocument


class VectorStore(ABC):
	"""Persistence layer for :class:`SearchDocument` instances with vectors."""

	@abstractmethod
	def add(self, documents: List[SearchDocument]) -> None:
		"""Insert documents. Each must carry a non-None ``embedding``."""

	@abstractmethod
	def search(
			self,
			query_embedding: List[float],
			top_k: int = 10,
			filters: Optional[Dict[str, Any]] = None,
	) -> List[SearchDocument]:
		"""Return the ``top_k`` most similar documents, optionally filtered by
		metadata. Results are returned in descending similarity order."""

	@abstractmethod
	def delete_by_filter(self, filters: Dict[str, Any]) -> int:
		"""Delete every document whose metadata matches all ``filters`` entries.
		Returns the number of rows deleted."""

	@abstractmethod
	def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
		"""Number of stored documents (optionally filtered)."""

	@abstractmethod
	def drop(self) -> None:
		"""Drop the underlying table/collection. Mostly used in tests."""
