"""Tests for the logic-based Factor matcher.

These build minimal ``Factor`` / ``Topic`` objects (the real model types from
watchmen-model) and exercise ``LogicMatcher`` directly — no database, no
principal service.
"""
from watchmen_model.admin import Factor, FactorType, Topic

from watchmen_pii.model import (
	LinkedFactor,
	MATCH_SOURCE_KEYWORD,
	MATCH_SOURCE_TYPE,
	PIIClassificationTerm,
)
from watchmen_pii.service.logic_matcher import (
	CONFIDENCE_KEYWORD_LABEL,
	CONFIDENCE_KEYWORD_NAME,
	CONFIDENCE_TYPE,
	LogicMatcher,
)


def _factor(factor_id, name=None, label=None, factor_type=None):
	f = Factor()
	f.factorId = factor_id
	f.name = name
	f.label = label
	f.type = factor_type
	return f


def _topic(topic_id, name, factors):
	t = Topic()
	t.topicId = topic_id
	t.name = name
	t.factors = factors
	return t


def _term(name='证件号码', factor_type_patterns=None, keyword_patterns=None):
	return PIIClassificationTerm(
		name=name,
		factorTypePatterns=factor_type_patterns or [],
		keywordPatterns=keyword_patterns or [],
	)


def test_factor_type_match_wins_at_full_confidence():
	topic = _topic('t1', 'policy', [_factor('f1', name='idcard', factor_type=FactorType.ID_NO)])
	term = _term(factor_type_patterns=['id-no'], keyword_patterns=['unused'])
	hits = LogicMatcher().match(term, [topic])
	assert len(hits) == 1
	assert hits[0].factorId == 'f1'
	assert hits[0].matchConfidence == CONFIDENCE_TYPE
	assert hits[0].matchSource == MATCH_SOURCE_TYPE


def test_keyword_name_match_higher_than_label():
	topic = _topic('t1', 'policy', [
		_factor('f1', name='premium_amount'),       # name match -> 0.9
		_factor('f2', label='the premium amount'),  # label match -> 0.8
	])
	term = _term(name='保费', keyword_patterns=['premium'])
	hits = LogicMatcher().match(term, [topic])
	assert {h.factorId for h in hits} == {'f1', 'f2'}
	name_hit = next(h for h in hits if h.factorId == 'f1')
	label_hit = next(h for h in hits if h.factorId == 'f2')
	assert name_hit.matchConfidence == CONFIDENCE_KEYWORD_NAME
	assert label_hit.matchConfidence == CONFIDENCE_KEYWORD_LABEL
	assert name_hit.matchSource == MATCH_SOURCE_KEYWORD


def test_no_patterns_yields_no_hits():
	topic = _topic('t1', 'policy', [_factor('f1', name='anything')])
	term = _term()
	hits = LogicMatcher().match(term, [topic])
	assert hits == []


def test_dedup_keeps_highest_confidence():
	# Same factor matches by type (1.0) and keyword (0.9); type must win.
	topic = _topic('t1', 'policy', [
		_factor('f1', name='mobile', factor_type=FactorType.MOBILE),
	])
	term = _term(
		factor_type_patterns=['mobile'],
		keyword_patterns=['mobile'],
	)
	hits = LogicMatcher().match(term, [topic])
	assert len(hits) == 1
	assert hits[0].matchConfidence == CONFIDENCE_TYPE
	assert hits[0].matchSource == MATCH_SOURCE_TYPE


def test_results_sorted_by_confidence_desc():
	topic = _topic('t1', 'policy', [
		_factor('f1', label='premium'),     # 0.8
		_factor('f2', name='premium'),      # 0.9
		_factor('f3', factor_type=FactorType.ID_NO),  # type not in patterns -> 0
	])
	term = _term(keyword_patterns=['premium'])
	hits = LogicMatcher().match(term, [topic])
	assert [h.matchConfidence for h in hits] == sorted([h.matchConfidence for h in hits], reverse=True)
	assert hits[0].factorId == 'f2'


def test_linked_factor_key_is_stable():
	lf = LinkedFactor(topicId='t1', factorId='f1')
	assert lf.key == 't1|f1'
