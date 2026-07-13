"""Tests for AIRecommender against a fake SemanticSearchService.

The fake records what was indexed and returns canned search results, so the
test exercises the metadata -> LinkedFactor mapping without any vector DB or
network call.
"""
import pytest

from watchmen_model.admin import Factor, Topic

from watchmen_pii.model import (
	MATCH_SOURCE_AI,
	PIIClassificationTerm,
)
from watchmen_pii.service.ai_recommender import AIRecommender
from watchmen_search import SearchDocument, SearchResult


class FakeSearchService:
	def __init__(self):
		self.indexed = []
		self.deleted = []
		self.canned_results = []

	async def index_documents(self, documents):
		self.indexed.extend(documents)

	async def search(self, query, top_k=10, filters=None, score_threshold=0.0):
		return list(self.canned_results)

	async def delete_by_filter(self, filters):
		self.deleted.append(filters)
		return 1


def _topic(topic_id, name, factors):
	t = Topic()
	t.topicId = topic_id
	t.name = name
	t.factors = factors
	return t


def _factor(factor_id, name, label=None):
	f = Factor()
	f.factorId = factor_id
	f.name = name
	f.label = label
	return f


@pytest.fixture
def fake_search():
	return FakeSearchService()


@pytest.mark.asyncio
async def test_ensure_factor_index_indexes_all_factors(fake_search):
	recommender = AIRecommender(fake_search)
	topics = [
		_topic('t1', 'policy', [_factor('f1', 'premium_amount'), _factor('f2', 'customer_name')]),
		_topic('t2', 'claim', [_factor('f3', 'claim_amount')]),
	]
	count = await recommender.ensure_factor_index(topics, tenant_id='t-tenant')
	assert count == 3
	assert len(fake_search.indexed) == 3
	# Each indexed document should carry topicId/factorId metadata.
	meta_keys = {doc.metadata.get('factorId') for doc in fake_search.indexed}
	assert meta_keys == {'f1', 'f2', 'f3'}
	# Re-indexing clears prior tenant docs first.
	assert fake_search.deleted == [{'tenantId': 't-tenant'}]


@pytest.mark.asyncio
async def test_recommend_maps_results_to_linked_factors(fake_search):
	fake_search.canned_results = [
		SearchResult(document=SearchDocument(
			id='t1:f1',
			text='premium amount',
			metadata={
				'topicId': 't1', 'topicName': 'policy',
				'factorId': 'f1', 'factorName': 'premium_amount',
				'factorLabel': None, 'factorType': None, 'tenantId': 't-tenant',
			},
		), score=0.91),
		SearchResult(document=SearchDocument(
			id='t2:f3',
			text='claim amount',
			metadata={
				'topicId': 't2', 'topicName': 'claim',
				'factorId': 'f3', 'factorName': 'claim_amount',
				'factorLabel': None, 'factorType': None, 'tenantId': 't-tenant',
			},
		), score=0.77),
	]
	recommender = AIRecommender(fake_search)
	term = PIIClassificationTerm(
		name='保费', description='insurance premium',
		keywordPatterns=['premium', 'premium_amount'],
	)
	hits = await recommender.recommend(term, score_threshold=0.75)
	assert len(hits) == 2
	# Higher-score result first (sorted desc).
	assert hits[0].factorId == 'f1'
	assert hits[0].matchConfidence == 0.91
	assert hits[0].matchSource == MATCH_SOURCE_AI
	assert hits[0].confirmed is False
	assert hits[1].factorId == 'f3'


@pytest.mark.asyncio
async def test_recommend_dedups_by_topic_factor(fake_search):
	# Same factor returned twice by the search; recommender must keep the best.
	meta = {
		'topicId': 't1', 'topicName': 'policy',
		'factorId': 'f1', 'factorName': 'premium_amount',
		'factorLabel': None, 'factorType': None, 'tenantId': 't-tenant',
	}
	fake_search.canned_results = [
		SearchResult(document=SearchDocument(id='t1:f1', text='premium amount', metadata=meta), score=0.80),
		SearchResult(document=SearchDocument(id='t1:f1', text='premium amount', metadata=meta), score=0.95),
	]
	recommender = AIRecommender(fake_search)
	term = PIIClassificationTerm(name='保费', keywordPatterns=['premium'])
	hits = await recommender.recommend(term, score_threshold=0.0)
	assert len(hits) == 1
	assert hits[0].matchConfidence == 0.95


@pytest.mark.asyncio
async def test_recommend_returns_empty_for_blank_term(fake_search):
	recommender = AIRecommender(fake_search)
	term = PIIClassificationTerm(name='', description=None, keywordPatterns=[])
	hits = await recommender.recommend(term)
	assert hits == []
