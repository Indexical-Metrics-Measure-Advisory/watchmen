"""Factor discovery orchestration service.

Runs the logic and/or AI channels for a term and merges their results, per
section 6 of the design doc. The merged list is written back to the term's
``linkedFactors`` (all entries ``confirmed=False`` pending user review).
"""
from typing import List, Optional

from watchmen_auth import PrincipalService
from watchmen_meta.admin import TopicService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import Topic

from watchmen_pii.meta import PIITermService
from watchmen_pii.model import (
	DiscoverResult,
	LinkedFactor,
	MATCH_STRATEGY_AI,
	MATCH_STRATEGY_LOGIC,
	MATCH_STRATEGY_LOGIC_AND_AI,
	PIIClassificationTerm,
)
from watchmen_pii.service.ai_recommender import AIRecommender
from watchmen_pii.service.logic_matcher import LogicMatcher


class FactorDiscoveryService:
	"""Discovers factors for a term using logic and/or AI matching."""

	def __init__(
			self,
			pii_term_service: PIITermService,
			principal_service: PrincipalService,
			ai_recommender: Optional[AIRecommender] = None,
			logic_matcher: Optional[LogicMatcher] = None,
	) -> None:
		self._pii_term_service = pii_term_service
		self._principal_service = principal_service
		self._ai_recommender = ai_recommender
		self._logic_matcher = logic_matcher or LogicMatcher()

	def _load_all_topics(self) -> List[Topic]:
		"""Load all topics visible to the current principal."""
		topic_service = TopicService(
			self._pii_term_service.storage,
			self._pii_term_service.snowflakeGenerator,
			self._pii_term_service.principalService,
		)
		tenant_id = self._principal_service.get_tenant_id()
		return topic_service.find_all(tenant_id) if tenant_id else []

	async def discover(
			self,
			term_id: str,
			strategy: Optional[str] = None,
			score_threshold: float = 0.75,
	) -> DiscoverResult:
		term = self._pii_term_service.find_by_id(term_id)
		if term is None:
			return DiscoverResult(termId=term_id, linkedFactors=[], totalCount=0)

		effective_strategy = (strategy or term.matchStrategy or MATCH_STRATEGY_LOGIC).strip()
		topics = self._load_all_topics()

		logic_hits: List[LinkedFactor] = []
		ai_hits: List[LinkedFactor] = []

		if effective_strategy in (MATCH_STRATEGY_LOGIC, MATCH_STRATEGY_LOGIC_AND_AI):
			logic_hits = self._logic_matcher.match(term, topics)
		if effective_strategy in (MATCH_STRATEGY_AI, MATCH_STRATEGY_LOGIC_AND_AI):
			if self._ai_recommender is not None:
				tenant_id = self._principal_service.get_tenant_id()
				await self._ai_recommender.ensure_factor_index(topics, tenant_id)
				ai_hits = await self._ai_recommender.recommend(
					term, score_threshold=score_threshold
				)

		merged = self._merge(logic_hits, ai_hits)
		# Preserve any previously confirmed links (don't clobber user work).
		preserved_confirmed = [
			lf for lf in (term.linkedFactors or []) if lf.confirmed
		]
		new_linked = self._merge(merged, preserved_confirmed)

		term.linkedFactors = new_linked
		self._pii_term_service.update(term)

		return DiscoverResult(termId=term_id, linkedFactors=new_linked, totalCount=len(new_linked))

	def confirm(self, term_id: str, factor_ids: List[str], remove_factor_ids: List[str]) -> PIIClassificationTerm:
		"""Mark ``factor_ids`` confirmed and drop ``remove_factor_ids``.

		Returns the updated term. Raises ``KeyError``-style ``LookupError`` if
		the term does not exist.
		"""
		term = self._pii_term_service.find_by_id(term_id)
		if term is None:
			raise LookupError(f"PII term '{term_id}' not found.")

		confirm_set = set(factor_ids or [])
		remove_set = set(remove_factor_ids or [])
		surviving: List[LinkedFactor] = []
		for lf in (term.linkedFactors or []):
			if lf.factorId in remove_set:
				continue
			if lf.factorId in confirm_set:
				lf.confirmed = True
			surviving.append(lf)
		term.linkedFactors = surviving
		return self._pii_term_service.update(term)

	@staticmethod
	def _merge(*groups: List[LinkedFactor]) -> List[LinkedFactor]:
		"""Merge groups, de-duplicating by topicId|factorId and keeping the
		highest-confidence entry."""
		best: dict = {}
		for group in groups:
			for lf in group or []:
				existing = best.get(lf.key)
				if existing is None or lf.matchConfidence > existing.matchConfidence:
					best[lf.key] = lf
		return sorted(
			best.values(),
			key=lambda lf: (-lf.matchConfidence, lf.topicId or '', lf.factorId or ''),
		)
