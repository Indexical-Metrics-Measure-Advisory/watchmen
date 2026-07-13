"""Logic-based Factor matcher (FactorType + keyword).

This is the "logic" channel of the Factor discovery engine (design doc
section 6). It runs entirely in-memory against a list of topics and produces
:class:`LinkedFactor` instances with deterministic confidence scores:

* FactorType hit  -> confidence 1.0, source ``'type'``
* factor.name hit -> confidence 0.9, source ``'keyword'``
* factor.label hit-> confidence 0.8, source ``'keyword'``

When a factor is matched by more than one rule, the highest-confidence hit
wins (and its source is recorded).
"""
from typing import Iterable, List

from watchmen_model.admin import Factor, Topic

from watchmen_pii.model import (
	LinkedFactor,
	MATCH_SOURCE_KEYWORD,
	MATCH_SOURCE_TYPE,
	PIIClassificationTerm,
)

# Confidence constants — exposed as module attrs so tests can assert exactness.
CONFIDENCE_TYPE = 1.0
CONFIDENCE_KEYWORD_NAME = 0.9
CONFIDENCE_KEYWORD_LABEL = 0.8

#: Per the design doc, FactorType hits use the enum's string value.
def _factor_type_value(factor: Factor) -> str:
	if factor.type is None:
		return ''
	# FactorType is a (str, Enum); use .value when present.
	return getattr(factor.type, 'value', str(factor.type))


def _matches_any(haystack_lower: str, patterns: Iterable[str]) -> bool:
	if not haystack_lower or not patterns:
		return False
	for pat in patterns:
		if pat and pat.lower() in haystack_lower:
			return True
	return False


class LogicMatcher:
	"""Matches a term's patterns against the factors of a set of topics."""

	def match(self, term: PIIClassificationTerm, topics: Iterable[Topic]) -> List[LinkedFactor]:
		type_patterns = [p for p in (term.factorTypePatterns or []) if p]
		keyword_patterns = [p for p in (term.keywordPatterns or []) if p]
		if not type_patterns and not keyword_patterns:
			return []

		best: dict = {}
		for topic in topics or []:
			topic_id = topic.topicId
			topic_name = topic.name
			for factor in topic.factors or []:
				hit_confidence, hit_source = self._score_factor(
					factor, type_patterns, keyword_patterns
				)
				if hit_confidence <= 0:
					continue
				key = f"{topic_id}|{factor.factorId}"
				existing = best.get(key)
				if existing is None or hit_confidence > existing.matchConfidence:
					best[key] = LinkedFactor(
						topicId=topic_id,
						topicName=topic_name,
						factorId=factor.factorId,
						factorName=factor.name,
						factorLabel=factor.label,
						factorType=_factor_type_value(factor) or None,
						matchConfidence=hit_confidence,
						matchSource=hit_source,
						confirmed=False,
					)
		# Sort by confidence desc, then by name for stable output.
		return sorted(
			best.values(),
			key=lambda lf: (-lf.matchConfidence, lf.topicId or '', lf.factorId or ''),
		)

	def _score_factor(
			self,
			factor: Factor,
			type_patterns: List[str],
			keyword_patterns: List[str],
	):
		# 1) FactorType match wins outright at 1.0.
		factor_type_value = _factor_type_value(factor)
		if factor_type_value and factor_type_value in type_patterns:
			return CONFIDENCE_TYPE, MATCH_SOURCE_TYPE
		# 2) keyword match on name (0.9) then label (0.8).
		name = (factor.name or '')
		label = (factor.label or '')
		if _matches_any(name.lower(), keyword_patterns):
			return CONFIDENCE_KEYWORD_NAME, MATCH_SOURCE_KEYWORD
		if _matches_any(label.lower(), keyword_patterns):
			return CONFIDENCE_KEYWORD_LABEL, MATCH_SOURCE_KEYWORD
		return 0.0, MATCH_SOURCE_KEYWORD
