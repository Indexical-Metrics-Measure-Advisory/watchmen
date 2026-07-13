"""Tests for FactorDiscoveryService merge + confirm logic.

We test the static ``_merge`` helper directly (the de-dup core) and the
``confirm`` path against an in-memory fake ``PIITermService``. This avoids any
real storage while still exercising the orchestration logic.
"""
import pytest

from watchmen_pii.model import (
	LinkedFactor,
	MATCH_SOURCE_AI,
	MATCH_SOURCE_TYPE,
	PIIClassificationTerm,
)
from watchmen_pii.service.factor_discovery_service import FactorDiscoveryService


class FakePIITermService:
	"""In-memory stand-in for PIITermService used by confirm()."""

	def __init__(self, term=None):
		self._term = term

	def find_by_id(self, term_id):
		if self._term is not None and self._term.termId == term_id:
			return self._term
		return None

	def update(self, term):
		self._term = term
		return term


def _lf(topic_id, factor_id, confidence=0.5, source=MATCH_SOURCE_TYPE, confirmed=False):
	return LinkedFactor(
		topicId=topic_id, factorId=factor_id,
		matchConfidence=confidence, matchSource=source, confirmed=confirmed,
	)


def test_merge_dedups_by_topic_factor_and_keeps_highest():
	logic_hits = [_lf('t1', 'f1', confidence=0.9), _lf('t1', 'f2', confidence=1.0)]
	ai_hits = [_lf('t1', 'f1', confidence=0.8), _lf('t1', 'f3', confidence=0.7)]
	merged = FactorDiscoveryService._merge(logic_hits, ai_hits)
	keys = {m.key for m in merged}
	assert keys == {'t1|f1', 't1|f2', 't1|f3'}
	# t1|f1 appears in both; 0.9 (logic) should win over 0.8 (ai).
	f1 = next(m for m in merged if m.key == 't1|f1')
	assert f1.matchConfidence == 0.9


def test_merge_preserves_confirmed_links_over_new_ones():
	confirmed = [_lf('t1', 'f1', confidence=0.3, confirmed=True)]
	new = [_lf('t1', 'f1', confidence=0.95)]
	merged = FactorDiscoveryService._merge(new, confirmed)
	assert len(merged) == 1
	# Even though new is higher, confirmed must survive (it carries user intent).
	assert merged[0].confirmed is True


def test_confirm_marks_factors_and_drops_removed():
	term = PIIClassificationTerm(termId='term-1', name='x', linkedFactors=[
		_lf('t1', 'f1', confirmed=False),
		_lf('t1', 'f2', confirmed=False),
		_lf('t1', 'f3', confirmed=False),
	])
	service = FakePIITermService(term=term)
	discovery = FactorDiscoveryService(pii_term_service=service, principal_service=None)

	updated = discovery.confirm('term-1', factor_ids=['f2'], remove_factor_ids=['f3'])
	ids = {lf.factorId for lf in updated.linkedFactors}
	assert ids == {'f1', 'f2'}
	f2 = next(lf for lf in updated.linkedFactors if lf.factorId == 'f2')
	assert f2.confirmed is True
	f1 = next(lf for lf in updated.linkedFactors if lf.factorId == 'f1')
	assert f1.confirmed is False


def test_confirm_raises_when_term_missing():
	service = FakePIITermService(term=None)
	discovery = FactorDiscoveryService(pii_term_service=service, principal_service=None)
	with pytest.raises(LookupError):
		discovery.confirm('nope', factor_ids=[], remove_factor_ids=[])


def test_seed_default_terms_count_is_eleven():
	from watchmen_pii.seed import default_pii_terms
	terms = default_pii_terms()
	assert len(terms) == 11
	names = {t.name for t in terms}
	# Spot-check a few expected terms.
	assert '证件号码' in names
	assert '保费' in names
	assert '银行卡号' in names
