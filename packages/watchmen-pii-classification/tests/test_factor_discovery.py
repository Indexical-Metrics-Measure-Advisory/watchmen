"""Tests for FactorDiscoveryService scoped discovery, add_factor and confirm.

We test the static ``_merge`` helper directly (the de-dup core) and the
discover/add_factor/confirm paths against an in-memory fake
``PIITermService`` plus a stubbed topic lookup. This avoids any real storage
while still exercising the orchestration logic.
"""
import pytest

from watchmen_model.admin import Factor, FactorType, Topic

from watchmen_pii.model import (
	LinkedFactor,
	MATCH_SOURCE_MANUAL,
	MATCH_SOURCE_TYPE,
	PIIClassificationTerm,
)
from watchmen_pii.service.factor_discovery_service import FactorDiscoveryService


class FakePIITermService:
	"""In-memory stand-in for PIITermService."""

	def __init__(self, term=None):
		self._term = term

	def find_by_id(self, term_id):
		if self._term is not None and self._term.termId == term_id:
			return self._term
		return None

	def update(self, term):
		self._term = term
		return term


class StubbedDiscoveryService(FactorDiscoveryService):
	"""Bypasses storage by injecting the topic lookup directly."""

	def __init__(self, pii_term_service, topics_by_id):
		super().__init__(pii_term_service=pii_term_service, principal_service=None)
		self._topics_by_id = topics_by_id

	def _find_topic(self, topic_id):
		return self._topics_by_id.get(topic_id)


def _lf(topic_id, factor_id, confidence=0.5, source=MATCH_SOURCE_TYPE, confirmed=False):
	return LinkedFactor(
		topicId=topic_id, factorId=factor_id,
		matchConfidence=confidence, matchSource=source, confirmed=confirmed,
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


# ---------------------------------------------------------------------- _merge

def test_merge_dedups_by_topic_factor_and_keeps_highest():
	logic_hits = [_lf('t1', 'f1', confidence=0.9), _lf('t1', 'f2', confidence=1.0)]
	other_hits = [_lf('t1', 'f1', confidence=0.8), _lf('t1', 'f3', confidence=0.7)]
	merged = FactorDiscoveryService._merge(logic_hits, other_hits)
	keys = {m.key for m in merged}
	assert keys == {'t1|f1', 't1|f2', 't1|f3'}
	# t1|f1 appears in both; 0.9 should win over 0.8.
	f1 = next(m for m in merged if m.key == 't1|f1')
	assert f1.matchConfidence == 0.9


def test_merge_preserves_confirmed_links_over_new_ones():
	confirmed = [_lf('t1', 'f1', confidence=0.3, confirmed=True)]
	new = [_lf('t1', 'f1', confidence=0.95)]
	merged = FactorDiscoveryService._merge(new, confirmed)
	assert len(merged) == 1
	# Even though new is higher, confirmed must survive (it carries user intent).
	assert merged[0].confirmed is True


# ---------------------------------------------------------------------- discover

def test_discover_scans_only_linked_topics():
	topic_in = _topic('t1', 'in-scope', [_factor('f1', name='idcard', factor_type=FactorType.ID_NO)])
	topic_out = _topic('t2', 'out-of-scope', [_factor('f2', name='idcard2', factor_type=FactorType.ID_NO)])
	term = PIIClassificationTerm(
		termId='term-1', name='证件号码',
		topicIds=['t1'],
		factorTypePatterns=['id-no'],
	)
	service = FakePIITermService(term=term)
	discovery = StubbedDiscoveryService(service, {'t1': topic_in, 't2': topic_out})

	result = discovery.discover('term-1')
	keys = {lf.key for lf in result.linkedFactors}
	assert keys == {'t1|f1'}
	# Written back to the term.
	assert {lf.key for lf in service.find_by_id('term-1').linkedFactors} == {'t1|f1'}


def test_discover_skips_missing_topics():
	topic_in = _topic('t1', 'in-scope', [_factor('f1', name='idcard', factor_type=FactorType.ID_NO)])
	term = PIIClassificationTerm(
		termId='term-1', name='证件号码',
		topicIds=['t1', 't-gone'],
		factorTypePatterns=['id-no'],
	)
	discovery = StubbedDiscoveryService(FakePIITermService(term=term), {'t1': topic_in})

	result = discovery.discover('term-1')
	assert {lf.key for lf in result.linkedFactors} == {'t1|f1'}


def test_discover_empty_topic_ids_returns_existing_links():
	existing = [_lf('t1', 'f1', confidence=1.0, source=MATCH_SOURCE_MANUAL, confirmed=True)]
	term = PIIClassificationTerm(termId='term-1', name='x', topicIds=[], linkedFactors=existing)
	discovery = StubbedDiscoveryService(FakePIITermService(term=term), {})

	result = discovery.discover('term-1')
	assert result.totalCount == 1
	assert [lf.key for lf in result.linkedFactors] == ['t1|f1']


def test_discover_preserves_confirmed_and_manual_links():
	topic = _topic('t1', 'in-scope', [
		_factor('f1', name='idcard', factor_type=FactorType.ID_NO),
		_factor('f2', name='other'),
	])
	term = PIIClassificationTerm(
		termId='term-1', name='证件号码',
		topicIds=['t1'],
		factorTypePatterns=['id-no'],
		linkedFactors=[
			# confirmed link that logic discovery also finds
			_lf('t1', 'f1', confidence=0.3, confirmed=True),
			# manual link that logic discovery does not find
			_lf('t1', 'f9', confidence=1.0, source=MATCH_SOURCE_MANUAL, confirmed=True),
			# unconfirmed auto link that logic discovery no longer finds
			_lf('t1', 'f8', confidence=0.8),
		],
	)
	discovery = StubbedDiscoveryService(FakePIITermService(term=term), {'t1': topic})

	result = discovery.discover('term-1')
	by_key = {lf.key: lf for lf in result.linkedFactors}
	# f1 still present and confirmed; f9 (manual) survives; f8 (stale auto) dropped.
	assert set(by_key.keys()) == {'t1|f1', 't1|f9'}
	assert by_key['t1|f1'].confirmed is True
	assert by_key['t1|f9'].matchSource == MATCH_SOURCE_MANUAL
	assert by_key['t1|f9'].confirmed is True


def test_discover_raises_when_term_missing():
	discovery = StubbedDiscoveryService(FakePIITermService(term=None), {})
	with pytest.raises(LookupError):
		discovery.discover('nope')


# ---------------------------------------------------------------------- add_factor

def test_add_factor_fills_fields_and_marks_manual():
	topic = _topic('t1', 'policy', [
		_factor('f1', name='premium_amount', label='保费金额', factor_type=FactorType.TEXT),
	])
	term = PIIClassificationTerm(termId='term-1', name='保费', topicIds=['t1'])
	service = FakePIITermService(term=term)
	discovery = StubbedDiscoveryService(service, {'t1': topic})

	updated = discovery.add_factor('term-1', 't1', 'f1')
	assert len(updated.linkedFactors) == 1
	lf = updated.linkedFactors[0]
	assert lf.topicId == 't1'
	assert lf.topicName == 'policy'
	assert lf.factorId == 'f1'
	assert lf.factorName == 'premium_amount'
	assert lf.factorLabel == '保费金额'
	assert lf.factorType == 'text'
	assert lf.matchConfidence == 1.0
	assert lf.matchSource == MATCH_SOURCE_MANUAL
	assert lf.confirmed is True


def test_add_factor_is_idempotent():
	topic = _topic('t1', 'policy', [_factor('f1', name='premium_amount')])
	term = PIIClassificationTerm(termId='term-1', name='保费', topicIds=['t1'])
	discovery = StubbedDiscoveryService(FakePIITermService(term=term), {'t1': topic})

	discovery.add_factor('term-1', 't1', 'f1')
	updated = discovery.add_factor('term-1', 't1', 'f1')
	assert len(updated.linkedFactors) == 1


def test_add_factor_raises_for_missing_topic_or_factor():
	topic = _topic('t1', 'policy', [_factor('f1', name='x')])
	term = PIIClassificationTerm(termId='term-1', name='保费')
	discovery = StubbedDiscoveryService(FakePIITermService(term=term), {'t1': topic})

	with pytest.raises(LookupError):
		discovery.add_factor('term-1', 't-gone', 'f1')
	with pytest.raises(LookupError):
		discovery.add_factor('term-1', 't1', 'f-gone')
	with pytest.raises(LookupError):
		StubbedDiscoveryService(FakePIITermService(term=None), {}).add_factor('nope', 't1', 'f1')


# ---------------------------------------------------------------------- confirm

def test_confirm_marks_factors_and_drops_removed_by_key():
	term = PIIClassificationTerm(termId='term-1', name='x', linkedFactors=[
		_lf('t1', 'f1', confirmed=False),
		_lf('t1', 'f2', confirmed=False),
		# Same factor id on another topic must not be touched by t1|f2 keys.
		_lf('t2', 'f2', confirmed=False),
		_lf('t1', 'f3', confirmed=False),
	])
	service = FakePIITermService(term=term)
	discovery = StubbedDiscoveryService(service, {})

	updated = discovery.confirm('term-1', ['t1|f2'], ['t1|f3'])
	by_key = {lf.key: lf for lf in updated.linkedFactors}
	assert set(by_key.keys()) == {'t1|f1', 't1|f2', 't2|f2'}
	assert by_key['t1|f2'].confirmed is True
	assert by_key['t1|f1'].confirmed is False
	assert by_key['t2|f2'].confirmed is False


def test_confirm_raises_when_term_missing():
	discovery = StubbedDiscoveryService(FakePIITermService(term=None), {})
	with pytest.raises(LookupError):
		discovery.confirm('nope', [], [])


# ---------------------------------------------------------------------- seed

def test_seed_default_terms_count_is_eleven():
	from watchmen_pii.seed import default_pii_terms
	terms = default_pii_terms()
	assert len(terms) == 11
	names = {t.name for t in terms}
	# Spot-check a few expected terms.
	assert '证件号码' in names
	assert '保费' in names
	assert '银行卡号' in names
	# Seed terms start with an empty (unscoped) topic list.
	assert all(t.topicIds == [] for t in terms)
