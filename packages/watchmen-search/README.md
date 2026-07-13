# watchmen-search

Generic **embedding + vector search** toolkit. Extracted from
`watchmen-ai-copilot/hypothesis/rag` so the platform has one business-agnostic
search primitive instead of a hypothesis-coupled RAG service.

This is a **leaf package**: it has **no `watchmen-*` dependencies**. Runtime
dependencies are `pydantic`, `lancedb`, `pyarrow`, `numpy`, `openai`.

## Package layout

```
src/watchmen_search/
├── __init__.py             # public exports
├── model.py                # SearchDocument / SearchResult
├── embedding_provider.py   # EmbeddingProvider (ABC)
├── azure_embedding.py      # AzureOpenAIProvider (no @register, no hard-coded keys)
├── vector_store.py         # VectorStore (ABC)
├── lance_store.py          # LanceVectorStore (generic 5-column schema)
├── semantic_search.py      # SemanticSearchService — embed + search facade
└── text_chunker.py         # semantic chunking pure functions
```

## Quick start

```python
from watchmen_search import (
    AzureOpenAIProvider, LanceVectorStore, SemanticSearchService, SearchDocument,
)

service = SemanticSearchService(
    embedding_provider=AzureOpenAIProvider(),               # reads AZURE_OPENAI_* env vars
    vector_store=LanceVectorStore(db_path="/data/vectors"), # default dim 1536
)

# index
await service.index_documents([
    SearchDocument(id="t1:f1", text="premium amount", metadata={"topicId": "t1", "factorId": "f1"}),
])

# search
results = await service.search("premium", top_k=10, score_threshold=0.75)

# delete by metadata
await service.delete_by_filter({"topicId": "t1"})
```

## Extraction notes (what changed vs. the original RAG code)

| Module | Extracted from | Change |
|---|---|---|
| `azure_embedding.py` | `azure_openai_register.py` | Dropped `@register("azure_openai")` + `TextEmbeddingFunction`; implements `EmbeddingProvider`. Azure key no longer hard-coded — explicit args or env vars only. |
| `lance_store.py` | `rag_emb_service.py` LanceDB ops | Generic 5-column schema (`id`, `text`, `metadata`, `vector`, `created_at`); no `simulation_id` / `challenge_title` / `semantic_section`. |
| `semantic_search.py` | `rag_emb_service.py` store/search | Replaced `store_simulation_result()` with generic `index_documents()`; normalizes LanceDB `_distance` to a `[0,1]` score. |
| `text_chunker.py` | `rag_emb_service.py` `_chunk_text_semantic` etc. | Module-level pure functions, no `self`, no hypothesis coupling. |
| `model.py` | `ChallengeDocument` / `VectorSearchResult` | Generalized to `SearchDocument` / `SearchResult`. |

## Tests

```
poetry install
poetry run pytest tests/
```

`test_text_chunker.py` runs with no external deps. `test_lance_store.py` and
`test_semantic_search.py` require `lancedb` + `pyarrow` (auto-skipped if
absent) and use a temporary on-disk DB plus a `FakeEmbeddingProvider`, so they
never hit the Azure OpenAI API.
