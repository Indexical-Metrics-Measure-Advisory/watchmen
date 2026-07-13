"""High-level semantic search API.

:class:`SemanticSearchService` composes an
:class:`~watchmen_search.embedding_provider.EmbeddingProvider` with a
:class:`~watchmen_search.vector_store.VectorStore`, exposing the three
operations the rest of the platform needs:

* :meth:`index_documents` — embed a batch of documents and store them
* :meth:`search` — embed the query and run a similarity search
* :meth:`delete_by_filter` — remove documents by metadata

This is the generalized counterpart to ``RAGEmbeddingService``'s
``store_simulation_result`` / ``search_similar_challenges`` / ``delete_*``
methods, minus all hypothesis-specific document-shaping logic.
"""
import asyncio
from logging import getLogger
from typing import Any, Dict, List, Optional

from .embedding_provider import EmbeddingProvider
from .model import SearchDocument, SearchResult
from .vector_store import VectorStore

logger = getLogger(__name__)


class SemanticSearchService:
	"""Embed + search facade.

	Embedding is performed in a thread executor because providers like
	``AzureOpenAIProvider`` are synchronous (HTTP calls). The ``search`` and
	``index_documents`` methods are therefore ``async`` and safe to call from a
	FastAPI handler.
	"""

	def __init__(self, embedding_provider: EmbeddingProvider, vector_store: VectorStore) -> None:
		self._provider = embedding_provider
		self._store = vector_store

	@property
	def embedding_provider(self) -> EmbeddingProvider:
		return self._provider

	@property
	def vector_store(self) -> VectorStore:
		return self._store

	async def index_documents(self, documents: List[SearchDocument]) -> None:
		"""Embed each document's ``text`` and persist it.

		Documents that already carry an ``embedding`` are not re-embedded (this
		allows callers to skip embedding for pre-computed vectors).
		"""
		if not documents:
			return
		to_embed_idx = [i for i, d in enumerate(documents) if d.embedding is None]
		if to_embed_idx:
			texts = [documents[i].text for i in to_embed_idx]
			embeddings = await asyncio.to_thread(self._provider.embed_batch, texts)
			if len(embeddings) != len(to_embed_idx):
				raise RuntimeError(
					f"Embedding provider returned {len(embeddings)} vectors for "
					f"{len(to_embed_idx)} inputs."
				)
			for slot, embedding in zip(to_embed_idx, embeddings):
				documents[slot].embedding = embedding
		self._store.add(documents)
		logger.info("Indexed %d documents.", len(documents))

	async def search(
			self,
			query: str,
			top_k: int = 10,
			filters: Optional[Dict[str, Any]] = None,
			score_threshold: float = 0.0,
	) -> List[SearchResult]:
		"""Run a semantic similarity search.

		``score_threshold`` (0.0-1.0) drops anything below that normalized
		similarity. Distances returned by the store are normalized to a score in
		``[0, 1]`` via ``score = 1 - distance / 2`` (LanceDB cosine distance
		range). Results are sorted by score descending.
		"""
		query_embedding = await asyncio.to_thread(self._provider.embed_batch, [query])
		if not query_embedding:
			return []
		query_vector = query_embedding[0]

		# Prefer the distance-aware path when the store supports it, so we can
		# normalize consistently. Fall back to a plain document search.
		distances: Optional[List[float]] = None
		get_distance = getattr(self._store, "distance", None)
		if callable(get_distance):
			distances = get_distance(query_vector, top_k=top_k, where=None)

		docs = self._store.search(query_vector, top_k=top_k, filters=filters)

		# If distances are available, prefer them (same ordering as the search).
		if distances is not None and len(distances) == len(docs):
			scored = [
				(doc, _normalize_score(dist))
				for doc, dist in zip(docs, distances)
			]
		else:
			# No distance info; we cannot compute a score. Assign 0.0 so the
			# threshold filter still works deterministically.
			scored = [(doc, 0.0) for doc in docs]

		results = [
			SearchResult(document=doc, score=score)
			for doc, score in scored
			if score >= score_threshold
		]
		results.sort(key=lambda r: r.score, reverse=True)
		logger.debug("Semantic search for %r returned %d results.", query[:50], len(results))
		return results

	async def delete_by_filter(self, filters: Dict[str, Any]) -> int:
		deleted = self._store.delete_by_filter(filters)
		logger.info("Deleted %d documents matching %r.", deleted, filters)
		return deleted

	async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
		return self._store.count(filters)


def _normalize_score(distance: float) -> float:
	"""Normalize a LanceDB cosine distance in ``[0, 2]`` to a similarity score
	in ``[0, 1]``. Distances outside the expected range are clamped.
	"""
	if distance <= 0:
		return 1.0
	if distance >= 2:
		return 0.0
	return 1.0 - distance / 2.0
