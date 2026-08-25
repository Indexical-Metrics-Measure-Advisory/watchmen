"""Factor discovery orchestration service.

Runs the logic channel for a term within the topics declared by the term's
``topicIds`` (the scan scope) and merges the hits into the term's
``linkedFactors``, per section 6 of the design doc. Manually added and
user-confirmed links are never overwritten by automatic discovery.
"""
from typing import List, Optional

from watchmen_auth import PrincipalService
from watchmen_meta.admin import TopicService
from watchmen_model.admin import Factor, Topic

from watchmen_pii.meta import PIITermService
from watchmen_pii.model import (
	DiscoverResult,
	LinkedFactor,
	MATCH_SOURCE_MANUAL,
	PIIClassificationTerm,
)
from watchmen_pii.service.logic_matcher import LogicMatcher


class FactorDiscoveryService:
	"""Discovers factors for a term using logic matching, scoped by topicIds."""

	def __init__(
			self,
			pii_term_service: PIITermService,
			principal_service: PrincipalService,
			logic_matcher: Optional[LogicMatcher] = None,
	) -> None:
		self._pii_term_service = pii_term_service
		self._principal_service = principal_service
		self._logic_matcher = logic_matcher or LogicMatcher()

	def _find_topic(self, topic_id: str) -> Optional[Topic]:
		"""Load one topic by id; extracted so tests can stub the lookup."""
		topic_service = TopicService(
			self._pii_term_service.storage,
			self._pii_term_service.snowflakeGenerator,
			self._pii_term_service.principalService,
		)
		return topic_service.find_by_id(topic_id)

	def _load_scoped_topics(self, topic_ids: List[str]) -> List[Topic]:
		"""Load the topics declared by the term; missing topics are skipped."""
		topics: List[Topic] = []
		for topic_id in topic_ids or []:
			if not topic_id:
				continue
			topic = self._find_topic(topic_id)
			if topic is not None:
				topics.append(topic)
		return topics

	def discover(self, term_id: str) -> DiscoverResult:
		"""Run logic discovery within the term's ``topicIds`` scope.

		Raises ``LookupError`` when the term does not exist. When the term
		declares no topics, discovery is a no-op and the existing linked
		factors are returned unchanged.
		"""
		term = self._pii_term_service.find_by_id(term_id)
		if term is None:
			raise LookupError(f"PII term '{term_id}' not found.")

		if not term.topicIds:
			existing = term.linkedFactors or []
			return DiscoverResult(termId=term_id, linkedFactors=existing, totalCount=len(existing))

		topics = self._load_scoped_topics(term.topicIds)
		logic_hits = self._logic_matcher.match(term, topics)
		# Confirmed and manually added links carry user intent; they are merged
		# first so automatic hits never clobber them.
		preserved = [
			lf for lf in (term.linkedFactors or [])
			if lf.confirmed or lf.matchSource == MATCH_SOURCE_MANUAL
		]
		new_linked = self._merge(preserved, logic_hits)

		term.linkedFactors = new_linked
		self._pii_term_service.update(term)

		return DiscoverResult(termId=term_id, linkedFactors=new_linked, totalCount=len(new_linked))

	def add_factor(self, term_id: str, topic_id: str, factor_id: str) -> PIIClassificationTerm:
		"""Manually link one factor to the term.

		The link is created with ``matchSource='manual'``, full confidence and
		``confirmed=True``. Idempotent: an existing link with the same
		topicId|factorId key is returned as-is. Raises ``LookupError`` when the
		term, topic or factor does not exist.
		"""
		term = self._pii_term_service.find_by_id(term_id)
		if term is None:
			raise LookupError(f"PII term '{term_id}' not found.")
		topic = self._find_topic(topic_id)
		if topic is None:
			raise LookupError(f"Topic '{topic_id}' not found.")
		factor = self._find_factor(topic, factor_id)
		if factor is None:
			raise LookupError(f"Factor '{factor_id}' not found in topic '{topic_id}'.")

		key = f"{topic_id}|{factor_id}"
		linked = term.linkedFactors or []
		for lf in linked:
			if lf.key == key:
				return term

		factor_type = getattr(factor.type, 'value', factor.type)
		linked.append(LinkedFactor(
			topicId=topic_id,
			topicName=topic.name,
			factorId=factor_id,
			factorName=factor.name,
			factorLabel=factor.label,
			factorType=str(factor_type) if factor_type is not None else None,
			matchConfidence=1.0,
			matchSource=MATCH_SOURCE_MANUAL,
			confirmed=True,
		))
		term.linkedFactors = linked
		return self._pii_term_service.update(term)

	def confirm(self, term_id: str, factor_keys: List[str], remove_keys: List[str]) -> PIIClassificationTerm:
		"""Mark ``factor_keys`` confirmed and drop ``remove_keys``.

		Keys are LinkedFactor keys (``topicId|factorId``). Returns the updated
		term. Raises ``LookupError`` if the term does not exist.
		"""
		term = self._pii_term_service.find_by_id(term_id)
		if term is None:
			raise LookupError(f"PII term '{term_id}' not found.")

		confirm_set = set(factor_keys or [])
		remove_set = set(remove_keys or [])
		surviving: List[LinkedFactor] = []
		for lf in (term.linkedFactors or []):
			if lf.key in remove_set:
				continue
			if lf.key in confirm_set:
				lf.confirmed = True
			surviving.append(lf)
		term.linkedFactors = surviving
		return self._pii_term_service.update(term)

	@staticmethod
	def _find_factor(topic: Topic, factor_id: str) -> Optional[Factor]:
		for factor in topic.factors or []:
			if factor.factorId == factor_id:
				return factor
		return None

	@staticmethod
	def _merge(*groups: List[LinkedFactor]) -> List[LinkedFactor]:
		"""Merge groups, de-duplicating by topicId|factorId and keeping the
		highest-confidence entry. A link confirmed by the user always keeps
		its confirmed flag, even when a fresher hit wins on confidence."""
		best: dict = {}
		for group in groups:
			for lf in group or []:
				existing = best.get(lf.key)
				if existing is None:
					best[lf.key] = lf
				elif lf.matchConfidence > existing.matchConfidence:
					lf.confirmed = lf.confirmed or existing.confirmed
					best[lf.key] = lf
				else:
					existing.confirmed = existing.confirmed or lf.confirmed
		return sorted(
			best.values(),
			key=lambda lf: (-lf.matchConfidence, lf.topicId or '', lf.factorId or ''),
		)
