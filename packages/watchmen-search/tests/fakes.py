"""Test helpers shared across watchmen-search tests."""
from typing import List

from watchmen_search.embedding_provider import EmbeddingProvider


class FakeEmbeddingProvider(EmbeddingProvider):
	"""Deterministic, dependency-free embedding provider for tests.

	It hashes each token of the input text into a fixed-size bag-of-words
	vector. Two inputs with overlapping tokens therefore have non-zero
	similarity, which is enough to drive the search/threshold tests without
	any network call.
	"""

	def __init__(self, dimension: int = 16) -> None:
		self._dimension = dimension

	@property
	def dimension(self) -> int:
		return self._dimension

	def embed_batch(self, texts: List[str]) -> List[List[float]]:
		results = []
		for text in texts:
			vector = [0.0] * self._dimension
			tokens = (text or "").lower().split()
			for token in tokens:
				# Stable hash regardless of PYTHONHASHSEED.
				bucket = sum(ord(ch) for ch in token) % self._dimension
				vector[bucket] += 1.0
			# L2 normalize so cosine distance math is sane.
			norm = sum(v * v for v in vector) ** 0.5
			if norm > 0:
				vector = [v / norm for v in vector]
			results.append(vector)
		return results
