"""AI recommendation channel for the Factor discovery engine.

Backed by :class:`watchmen_search.SemanticSearchService`. Two responsibilities:

1. :meth:`ensure_factor_index` — index every factor of every supplied topic as
   a :class:`SearchDocument` (text = ``name + label + description``), with
   ``topicId`` / ``factorId`` / ``factorName`` / ``factorType`` carried as
   metadata.
2. :meth:`recommend` — embed the term's text and return the top matches above
   the threshold as :class:`LinkedFactor` (``matchSource='ai'``).

Per the design doc, AI results are always marked as unconfirmed "辅助推荐".
"""
from logging import getLogger
from typing import Iterable, List, Optional

from watchmen_model.admin import Factor, Topic
from watchmen_search import SearchDocument, SemanticSearchService

from watchmen_pii.model import LinkedFactor, MATCH_SOURCE_AI, PIIClassificationTerm

logger = getLogger(__name__)


def _factor_type_value(factor: Factor) -> Optional[str]:
	if factor.type is None:
		return None
	return getattr(factor.type, 'value', str(factor.type))


class AIRecommender:
	"""Recommends factors via vector similarity over watchmen-search."""

	def __init__(self, search_service: SemanticSearchService) -> None:
		self._search = search_service

	async def ensure_factor_index(self, topics: Iterable[Topic], tenant_id: str) -> int:
		"""Index (or re-index) all factors of ``topics`` for ``tenant_id``.

		Re-indexing first deletes any prior documents for the tenant to keep
		the store in sync with the current topic/factor catalogue. Returns the
		number of factors indexed.
		"""
		# Clear previously indexed documents for this tenant so re-indexing does
		# not leave stale factors behind.
		try:
			await self._search.delete_by_filter({"tenantId": tenant_id})
		except Exception:  # pragma: no cover - store may be empty / missing
			logger.debug("No prior factor index for tenant %s.", tenant_id, exc_info=True)

		documents: List[SearchDocument] = []
		for topic in topics or []:
			if topic.topicId is None:
				continue
			for factor in topic.factors or []:
				if factor.factorId is None:
					continue
				text_parts = [p for p in [factor.name, factor.label, factor.description] if p]
				documents.append(SearchDocument(
					id=f"{topic.topicId}:{factor.factorId}",
					text=" ".join(text_parts),
					metadata={
						"topicId": topic.topicId,
						"topicName": topic.name,
						"factorId": factor.factorId,
						"factorName": factor.name,
						"factorLabel": factor.label,
						"factorType": _factor_type_value(factor),
						"tenantId": tenant_id,
					},
				))
		if not documents:
			return 0
		await self._search.index_documents(documents)
		return len(documents)

	async def recommend(
			self,
			term: PIIClassificationTerm,
			score_threshold: float = 0.75,
			top_k: int = 50,
	) -> List[LinkedFactor]:
		"""Return AI-recommended LinkedFactors for ``term``.

		The query text is the concatenation of the term's name, description and
		keyword patterns — the same surface used to index factors.
		"""
		query_parts = [term.name or '']
		if term.description:
			query_parts.append(term.description)
		if term.keywordPatterns:
			query_parts.extend([p for p in term.keywordPatterns if p])
		query = " ".join([p for p in query_parts if p]).strip()
		if not query:
			return []

		results = await self._search.search(
			query=query,
			top_k=top_k,
			score_threshold=score_threshold,
		)
		linked: List[LinkedFactor] = []
		for hit in results:
			meta = hit.document.metadata or {}
			topic_id = meta.get("topicId")
			factor_id = meta.get("factorId")
			if not topic_id or not factor_id:
				continue
			linked.append(LinkedFactor(
				topicId=str(topic_id),
				topicName=meta.get("topicName"),
				factorId=str(factor_id),
				factorName=meta.get("factorName"),
				factorLabel=meta.get("factorLabel"),
				factorType=meta.get("factorType"),
				matchConfidence=float(hit.score),
				matchSource=MATCH_SOURCE_AI,
				confirmed=False,
			))
		# De-duplicate by topic|factor, keeping the highest score.
		by_key: dict = {}
		for lf in linked:
			existing = by_key.get(lf.key)
			if existing is None or lf.matchConfidence > existing.matchConfidence:
				by_key[lf.key] = lf
		return sorted(
			by_key.values(),
			key=lambda lf: (-lf.matchConfidence, lf.topicId, lf.factorId),
		)
