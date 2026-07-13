"""Tests for PIITermShaper serialization round-trip.

Exercises the JSON encode/decode helpers for the three list-shaped fields
without touching a real storage SPI.
"""
from watchmen_pii.meta.pii_term_meta_service import (
	_load_linked_factors,
	_load_str_list,
	_dump_json,
	PIITermShaper,
)
from watchmen_pii.model import LinkedFactor, PIIClassificationTerm


def test_dump_and_load_str_list_roundtrip():
	payload = _dump_json(['id-no', 'mobile', 'email'])
	assert _load_str_list(payload) == ['id-no', 'mobile', 'email']
	# Empty / None inputs degrade safely.
	assert _load_str_list(None) == []
	assert _load_str_list('') == []
	assert _load_str_list('not-json') == []


def test_dump_and_load_linked_factors_roundtrip():
	factors = [
		LinkedFactor(topicId='t1', factorId='f1', matchConfidence=0.9, matchSource='keyword'),
		LinkedFactor(topicId='t2', factorId='f2', matchConfidence=1.0, matchSource='type'),
	]
	payload = _dump_json(factors)
	loaded = _load_linked_factors(payload)
	assert len(loaded) == 2
	assert loaded[0].topicId == 't1'
	assert loaded[0].factorId == 'f1'
	assert loaded[0].matchConfidence == 0.9
	assert loaded[1].topicId == 't2'


def test_load_linked_factors_handles_bad_input():
	assert _load_linked_factors(None) == []
	assert _load_linked_factors('') == []
	assert _load_linked_factors('not-json') == []
	# Non-list JSON payload should not crash.
	assert _load_linked_factors('{"a": 1}') == []


def test_shaper_serialize_contains_expected_columns():
	term = PIIClassificationTerm(
		termId='term-1',
		name='证件号码',
		category='客户数据',
		sensitivityLevel='1级',
		factorTypePatterns=['id-no'],
		keywordPatterns=['证件号', 'id_card'],
		linkedFactors=[LinkedFactor(topicId='t1', factorId='f1')],
	)
	term.tenantId = 'tenant-1'
	term.version = 1
	row = PIITermShaper().serialize(term)
	# Core columns present.
	assert row['term_id'] == 'term-1'
	assert row['name'] == '证件号码'
	assert row['category'] == '客户数据'
	assert row['sensitivity_level'] == '1级'
	assert row['tenant_id'] == 'tenant-1'
	assert row['version'] == 1
	# List-shaped fields are JSON-encoded strings.
	assert isinstance(row['factor_type_patterns'], str)
	assert 'id-no' in row['factor_type_patterns']
	assert isinstance(row['keyword_patterns'], str)
	assert isinstance(row['linked_factors'], str)


def test_shaper_deserialize_roundtrips_list_fields():
	term = PIIClassificationTerm(
		termId='term-2',
		name='保费',
		factorTypePatterns=['', 'unused'],  # blanks tolerated
		keywordPatterns=['premium'],
		linkedFactors=[LinkedFactor(topicId='t1', factorId='f1', confirmed=True)],
	)
	term.tenantId = 'tenant-1'
	term.version = 2
	row = PIITermShaper().serialize(term)
	restored = PIITermShaper().deserialize(row)
	assert restored.termId == 'term-2'
	assert restored.name == '保费'
	assert restored.tenantId == 'tenant-1'
	assert restored.version == 2
	# linkedFactors survive the round-trip with confirmed flag intact.
	assert len(restored.linkedFactors) == 1
	assert restored.linkedFactors[0].confirmed is True
