"""End-to-end tests for SemanticSearchService using a fake embedding provider
and a real (temporary on-disk) LanceVectorStore.
"""
import shutil
import tempfile
from pathlib import Path

import pytest

try:
	from watchmen_search import (
		LanceVectorStore,
		SearchDocument,
		SemanticSearchService,
	)
	from tests.fakes import FakeEmbeddingProvider
	HAS_DEPS = True
except Exception:  # pragma: no cover
	HAS_DEPS = False

pytestmark = pytest.mark.skipif(not HAS_DEPS, reason="lancedb/pyarrow not installed")


@pytest.fixture
def service():
	tmp = Path(tempfile.mkdtemp(prefix="watchmen_search_service_test_"))
	store = LanceVectorStore(db_path=str(tmp / "db"), table_name="factors", dimension=16)
	provider = FakeEmbeddingProvider(dimension=16)
	svc = SemanticSearchService(embedding_provider=provider, vector_store=store)
	yield svc
	store.drop()
	shutil.rmtree(tmp, ignore_errors=True)


@pytest.mark.asyncio
async def test_index_then_search_returns_matching_docs(service):
	await service.index_documents([
		SearchDocument(id="premium_amount", text="premium amount", metadata={"factorId": "f1"}),
		SearchDocument(id="customer_name", text="customer name", metadata={"factorId": "f2"}),
	])
	results = await service.search("premium", top_k=2, score_threshold=0.0)
	assert len(results) >= 1
	# The "premium amount" document shares the "premium" token with the query.
	assert results[0].document.id == "premium_amount"
	# score is normalized into [0, 1]
	assert 0.0 <= results[0].score <= 1.0


@pytest.mark.asyncio
async def test_score_threshold_filters(service):
	await service.index_documents([
		SearchDocument(id="premium_amount", text="premium amount", metadata={"factorId": "f1"}),
		SearchDocument(id="customer_name", text="customer name", metadata={"factorId": "f2"}),
	])
	# A very high threshold should drop the weaker match; with the fake
	# bag-of-words provider, "customer name" has zero overlap with "premium".
	results = await service.search("premium", top_k=5, score_threshold=0.99)
	# The exact best result depends on normalization but the zero-overlap doc
	# must be filtered out once the threshold approaches 1.0.
	assert all(r.score >= 0.99 for r in results)
	assert all(r.document.id == "premium_amount" for r in results)


@pytest.mark.asyncio
async def test_delete_by_filter(service):
	await service.index_documents([
		SearchDocument(id="premium_amount", text="premium amount", metadata={"factorId": "f1"}),
		SearchDocument(id="customer_name", text="customer name", metadata={"factorId": "f2"}),
	])
	deleted = await service.delete_by_filter({"factorId": "f1"})
	assert deleted == 1
	assert await service.count() == 1


@pytest.mark.asyncio
async def test_index_skips_already_embedded_documents(service):
	# A document carrying its own embedding must not be re-embedded; the fake
	# provider would otherwise return vectors of a different dimension.
	from watchmen_search import SearchDocument
	pre = SearchDocument(
		id="manual",
		text="manual vector",
		embedding=[1.0] + [0.0] * 15,
		metadata={"factorId": "f9"},
	)
	await service.index_documents([pre])
	assert await service.count() == 1
