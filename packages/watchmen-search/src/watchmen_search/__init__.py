"""watchmen-search — generic embedding + vector search toolkit.

Extracted from ``watchmen-ai-copilot/hypothesis/rag``. This package has no
dependencies on any ``watchmen-*`` package; it only depends on
``pydantic``, ``lancedb``, ``pyarrow``, ``numpy`` and ``openai``.

Typical usage::

    from watchmen_search import (
        AzureOpenAIProvider, LanceVectorStore, SemanticSearchService,
        SearchDocument,
    )

    service = SemanticSearchService(
        embedding_provider=AzureOpenAIProvider(),
        vector_store=LanceVectorStore(db_path="/data/vectors"),
    )
    await service.index_documents([SearchDocument(id="1", text="hello")])
    results = await service.search("hello", score_threshold=0.75)
"""
from .azure_embedding import AzureOpenAIProvider
from .embedding_provider import EmbeddingProvider
from .lance_store import LanceVectorStore
from .model import SearchDocument, SearchResult
from .semantic_search import SemanticSearchService
from .vector_store import VectorStore
from . import text_chunker

__all__ = [
	"SearchDocument",
	"SearchResult",
	"EmbeddingProvider",
	"AzureOpenAIProvider",
	"VectorStore",
	"LanceVectorStore",
	"SemanticSearchService",
	"text_chunker",
]

__version__ = "18.0.0"
