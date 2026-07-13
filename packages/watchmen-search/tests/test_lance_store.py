"""Tests for the LanceDB-backed vector store.

These exercise the real LanceVectorStore against a temporary on-disk database.
They require ``lancedb`` and ``pyarrow`` to be installed; if either is missing
the test module is skipped so the package can still be imported in
minimal environments.
"""
import shutil
import tempfile
from pathlib import Path

import pytest

try:
	from watchmen_search import LanceVectorStore, SearchDocument
	HAS_DEPS = True
except Exception:  # pragma: no cover - exercised only without lancedb
	HAS_DEPS = False

pytestmark = pytest.mark.skipif(not HAS_DEPS, reason="lancedb/pyarrow not installed")


def _fake_vector(seed: int, dim: int = 16) -> list:
	"""Build a deterministic unit vector with most of its mass in one bucket."""
	vec = [0.0] * dim
	vec[seed % dim] = 1.0
	return vec


@pytest.fixture
def store():
	tmp = Path(tempfile.mkdtemp(prefix="watchmen_search_test_"))
	s = LanceVectorStore(db_path=str(tmp / "db"), table_name="docs", dimension=16)
	yield s
	s.drop()
	shutil.rmtree(tmp, ignore_errors=True)


def test_add_and_count(store):
	docs = [
		SearchDocument(id="1", text="alpha", embedding=_fake_vector(0), metadata={"topicId": "t1"}),
		SearchDocument(id="2", text="beta", embedding=_fake_vector(1), metadata={"topicId": "t2"}),
	]
	store.add(docs)
	assert store.count() == 2
	assert store.count({"topicId": "t1"}) == 1


def test_search_returns_nearest_first(store):
	store.add([
		SearchDocument(id="a", text="alpha", embedding=_fake_vector(0)),
		SearchDocument(id="b", text="beta", embedding=_fake_vector(1)),
	])
	# Query vector identical to doc "a".
	results = store.search(_fake_vector(0), top_k=2)
	assert len(results) == 2
	# Nearest neighbor should be "a" (distance ~ 0).
	assert results[0].id == "a"


def test_delete_by_filter(store):
	store.add([
		SearchDocument(id="1", text="alpha", embedding=_fake_vector(0), metadata={"topicId": "t1"}),
		SearchDocument(id="2", text="beta", embedding=_fake_vector(1), metadata={"topicId": "t2"}),
	])
	deleted = store.delete_by_filter({"topicId": "t1"})
	assert deleted == 1
	assert store.count() == 1
	assert store.count({"topicId": "t2"}) == 1


def test_add_rejects_missing_embedding(store):
	doc = SearchDocument(id="x", text="no vector")
	with pytest.raises(ValueError):
		store.add([doc])


def test_add_rejects_wrong_dimension(store):
	doc = SearchDocument(id="x", text="wrong dim", embedding=[0.0] * 8)
	with pytest.raises(ValueError):
		store.add([doc])
