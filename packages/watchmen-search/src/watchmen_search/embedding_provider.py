"""Abstract embedding-provider interface.

Concrete implementations (see :mod:`watchmen_search.azure_embedding`) turn a
batch of text strings into fixed-dimension float vectors. The interface is
intentionally tiny so that alternative backends (local sentence-transformers,
other cloud providers, fakes for tests) can be plugged into
:class:`~watchmen_search.semantic_search.SemanticSearchService`.
"""
from abc import ABC, abstractmethod
from typing import List


class EmbeddingProvider(ABC):
	"""Turns text into vectors."""

	@abstractmethod
	def embed_batch(self, texts: List[str]) -> List[List[float]]:
		"""Embed a batch of texts, returning one vector per input (same order)."""

	@property
	@abstractmethod
	def dimension(self) -> int:
		"""The dimensionality of vectors produced by this provider."""
