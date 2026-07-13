"""LanceDB-backed :class:`~watchmen_search.vector_store.VectorStore`.

Extracted and generalized from ``rag_emb_service.py``. The original LanceDB
schema was littered with hypothesis-specific columns (``simulation_id``,
``challenge_title``, ``semantic_section`` ...); here it is collapsed to the
generic 5-column shape:

    id(str) | text(str) | metadata(str/JSON) | vector(list[float32, dim]) | created_at(timestamp)

Metadata filtering works by translating ``filters={"k": "v"}`` into LanceDB's
SQL ``where`` clause against the flattened metadata. For richer filtering,
callers may also pass a raw ``where`` string via :meth:`search_where`.
"""
import json
from datetime import datetime
from logging import getLogger
from pathlib import Path
from typing import Any, Dict, List, Optional

import pyarrow as pa

from .model import SearchDocument
from .vector_store import VectorStore

logger = getLogger(__name__)


def _metadata_to_where(filters: Optional[Dict[str, Any]]) -> Optional[str]:
	"""Translate ``{k: v}`` metadata filters into a LanceDB ``where`` clause.

	String values are single-quoted with embedded quotes doubled. Non-string
	values (numbers, bools) are rendered as-is.
	"""
	if not filters:
		return None
	clauses: List[str] = []
	for key, value in filters.items():
		if value is None:
			clauses.append(f"metadata IS NULL")
			continue
		if isinstance(value, str):
			escaped = value.replace("'", "''")
			# metadata is stored as a JSON string. Match on a substring
			# representation: ``"key": "value"``. This is good enough for the
			# equality filters we support and avoids a heavyweight JSON column.
			token = json.dumps({str(key): value}, ensure_ascii=False)[1:-1]
			escaped_token = token.replace("'", "''")
			clauses.append(f"metadata LIKE '%{escaped_token}%'")
		else:
			token = json.dumps({str(key): value}, ensure_ascii=False)[1:-1]
			escaped_token = token.replace("'", "''")
			clauses.append(f"metadata LIKE '%{escaped_token}%'")
	if not clauses:
		return None
	return " AND ".join(clauses)


class LanceVectorStore(VectorStore):
	"""A LanceDB-backed vector store.

	``db_path`` points to a local directory (LanceDB is file-based). One table
	per ``table_name``. The table is created lazily on first ``add`` if it does
	not exist; ``search`` against a missing table returns an empty list.
	"""

	def __init__(self, db_path: str, table_name: str = "documents", dimension: int = 1536) -> None:
		self.db_path = db_path
		self.table_name = table_name
		self.dimension = dimension
		# Imported lazily so importing watchmen_search does not require lancedb
		# at module load (tests can swap in an in-memory fake store).
		try:
			import lancedb  # type: ignore
		except ImportError as exc:  # pragma: no cover
			raise ImportError(
				"`lancedb` is required for LanceVectorStore. Install watchmen-search's "
				"runtime dependencies."
			) from exc
		Path(db_path).mkdir(parents=True, exist_ok=True)
		self._db = lancedb.connect(db_path)
		self._table = None
		self._open_or_create_table()

	def _arrow_schema(self) -> pa.Schema:
		return pa.schema([
			pa.field("id", pa.string()),
			pa.field("text", pa.string()),
			pa.field("metadata", pa.string()),
			pa.field("vector", pa.list_(pa.float32(), self.dimension)),
			pa.field("created_at", pa.timestamp("us")),
		])

	def _empty_table(self) -> pa.Table:
		schema = self._arrow_schema()
		return pa.table({
			"id": pa.array([], type=pa.string()),
			"text": pa.array([], type=pa.string()),
			"metadata": pa.array([], type=pa.string()),
			"vector": pa.array([], type=pa.list_(pa.float32(), self.dimension)),
			"created_at": pa.array([], type=pa.timestamp("us")),
		}, schema=schema)

	def _open_or_create_table(self) -> None:
		try:
			if self.table_name in self._db.table_names():
				self._table = self._db.open_table(self.table_name)
				logger.debug("Opened existing LanceDB table '%s'.", self.table_name)
			else:
				self._table = self._db.create_table(self.table_name, self._empty_table())
				logger.info("Created LanceDB table '%s' at %s.", self.table_name, self.db_path)
		except Exception:
			logger.exception("Failed to initialize LanceDB table '%s'.", self.table_name)
			raise

	def _ensure_dimension(self, embedding: List[float]) -> List[float]:
		if len(embedding) != self.dimension:
			raise ValueError(
				f"Embedding dimension mismatch: store expects {self.dimension}, "
				f"got {len(embedding)}."
			)
		return embedding

	def add(self, documents: List[SearchDocument]) -> None:
		if not documents:
			return
		ids, texts, metas, vectors, created = [], [], [], [], []
		for doc in documents:
			if doc.embedding is None:
				raise ValueError(
					f"SearchDocument '{doc.id}' has no embedding. "
					"Embed before calling VectorStore.add."
				)
			ids.append(doc.id)
			texts.append(doc.text)
			metas.append(json.dumps(doc.metadata, ensure_ascii=False))
			vectors.append(self._ensure_dimension(doc.embedding))
			created.append(doc.effective_created_at())
		table_data = pa.table({
			"id": pa.array(ids, type=pa.string()),
			"text": pa.array(texts, type=pa.string()),
			"metadata": pa.array(metas, type=pa.string()),
			"vector": pa.array(vectors, type=pa.list_(pa.float32(), self.dimension)),
			"created_at": pa.array(created, type=pa.timestamp("us")),
		})
		self._table.add(table_data)
		logger.debug("Added %d documents to LanceDB table '%s'.", len(documents), self.table_name)

	def search(
			self,
			query_embedding: List[float],
			top_k: int = 10,
			filters: Optional[Dict[str, Any]] = None,
	) -> List[SearchDocument]:
		where = _metadata_to_where(filters)
		return self.search_where(query_embedding, top_k=top_k, where=where)

	def search_where(
			self,
			query_embedding: List[float],
			top_k: int = 10,
			where: Optional[str] = None,
	) -> List[SearchDocument]:
		"""Lower-level entry point that accepts a raw LanceDB ``where`` clause."""
		self._ensure_dimension(query_embedding)
		query = self._table.search(query_embedding).limit(top_k)
		if where:
			query = query.where(where)
		try:
			df = query.to_list()
		except Exception:
			# An empty table or no-match query can raise inside LanceDB; treat
			# both as "no results".
			logger.debug("LanceDB search returned no rows for table '%s'.", self.table_name, exc_info=True)
			return []
		results: List[SearchDocument] = []
		for row in df:
			metadata_raw = row.get("metadata")
			try:
				metadata = json.loads(metadata_raw) if isinstance(metadata_raw, str) and metadata_raw else {}
			except json.JSONDecodeError:
				metadata = {}
			created_at = row.get("created_at")
			if isinstance(created_at, (int, float)):
				created_at = datetime.fromtimestamp(created_at)
			results.append(SearchDocument(
				id=row.get("id"),
				text=row.get("text"),
				metadata=metadata,
				embedding=None,
				created_at=created_at,
			))
		return results

	def delete_by_filter(self, filters: Dict[str, Any]) -> int:
		where = _metadata_to_where(filters)
		if where is None:
			return 0
		before = self._count_where(where)
		if before == 0:
			return 0
		self._table.delete(where)
		logger.debug("Deleted %d documents matching %r.", before, filters)
		return before

	def _count_where(self, where: Optional[str]) -> int:
		try:
			query = self._table.search()
			if where:
				query = query.where(where)
			df = query.to_list()
			return len(df)
		except Exception:
			logger.debug("LanceDB count failed for table '%s'.", self.table_name, exc_info=True)
			return 0

	def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
		return self._count_where(_metadata_to_where(filters))

	def distance(self, query_embedding: List[float], top_k: int = 10,
	             where: Optional[str] = None) -> List[float]:
		"""Return raw LanceDB ``_distance`` values for a query.

		LanceDB cosine distance lives in ``[0, 2]`` (0 = identical). Exposed so
		:class:`~watchmen_search.semantic_search.SemanticSearchService` can
		normalize it into a similarity score without re-running the query.
		"""
		self._ensure_dimension(query_embedding)
		query = self._table.search(query_embedding).limit(top_k)
		if where:
			query = query.where(where)
		try:
			df = query.to_list()
		except Exception:
			return []
		return [float(row.get("_distance", 2.0)) for row in df]

	def drop(self) -> None:
		try:
			self._db.drop_table(self.table_name)
			logger.info("Dropped LanceDB table '%s'.", self.table_name)
		except Exception:
			logger.debug("Could not drop LanceDB table '%s' (maybe missing).", self.table_name, exc_info=True)
		finally:
			self._table = None
