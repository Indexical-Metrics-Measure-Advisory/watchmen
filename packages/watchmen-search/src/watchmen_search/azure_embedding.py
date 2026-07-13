"""Azure OpenAI embedding provider.

Extracted from ``watchmen-ai-copilot/hypothesis/rag/azure_openai_register.py``.
Two key differences from the original:

1. The ``@register("azure_openai")`` lancedb registry hook and the
   ``TextEmbeddingFunction`` base class are removed — this is now a plain
   :class:`~watchmen_search.embedding_provider.EmbeddingProvider`, decoupled
   from any specific vector store.
2. The Azure OpenAI key is **never** hard-coded. It must be passed explicitly
   or read from the ``AZURE_OPENAI_API_KEY`` / ``AZURE_OPENAI_ENDPOINT`` /
   ``AZURE_OPENAI_DEPLOYMENT`` environment variables.
"""
import os
from functools import cached_property
from logging import getLogger
from typing import List, Optional

from .embedding_provider import EmbeddingProvider

logger = getLogger(__name__)

# Known embedding models -> output dimension. Only models listed here are
# accepted, since the vector store needs a concrete dimension up front.
_EMBEDDING_DIMENSIONS = {
	"text-embedding-ada-002": 1536,
	"text-embedding-3-small": 1536,
	"text-embedding-3-large": 3072,
}


class AzureOpenAIProvider(EmbeddingProvider):
	"""Generates embeddings via the Azure OpenAI embeddings API.

	Parameters are resolved in priority order: explicit argument first, then
	the matching ``AZURE_OPENAI_*`` environment variable. A ``ValueError`` is
	raised at construction time if any required parameter is missing.
	"""

	def __init__(
			self,
			azure_api_key: Optional[str] = None,
			azure_endpoint: Optional[str] = None,
			azure_deployment: Optional[str] = None,
			azure_api_version: str = "2024-02-01",
			model: str = "text-embedding-ada-002",
	) -> None:
		resolved_key = azure_api_key or os.environ.get("AZURE_OPENAI_API_KEY")
		resolved_endpoint = azure_endpoint or os.environ.get("AZURE_OPENAI_ENDPOINT")
		resolved_deployment = azure_deployment or os.environ.get("AZURE_OPENAI_DEPLOYMENT")
		if not all([resolved_key, resolved_endpoint, resolved_deployment]):
			raise ValueError(
				"Azure OpenAI configuration incomplete. Provide azure_api_key, "
				"azure_endpoint and azure_deployment (or the AZURE_OPENAI_API_KEY / "
				"AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_DEPLOYMENT environment variables)."
			)
		if model not in _EMBEDDING_DIMENSIONS:
			raise ValueError(
				f"Unknown embedding model '{model}'. Supported: "
				f"{sorted(_EMBEDDING_DIMENSIONS.keys())}."
			)

		self._model = model
		self._api_key = resolved_key
		self._endpoint = resolved_endpoint
		self._deployment = resolved_deployment
		self._api_version = azure_api_version

	@property
	def dimension(self) -> int:
		return _EMBEDDING_DIMENSIONS[self._model]

	@cached_property
	def _openai_client(self):
		# Imported lazily so the package can be imported without the `openai`
		# extra installed (e.g. in tests using a fake provider).
		try:
			from openai import AzureOpenAI  # type: ignore
		except ImportError as exc:  # pragma: no cover - exercised only without openai installed
			raise ImportError(
				"The `openai` package is required for AzureOpenAIProvider. "
				"Install watchmen-search's runtime dependencies."
			) from exc
		return AzureOpenAI(
			azure_endpoint=self._endpoint,
			api_key=self._api_key,
			api_version=self._api_version,
			azure_deployment=self._deployment,
		)

	def embed_batch(self, texts: List[str]) -> List[List[float]]:
		if not texts:
			return []
		response = self._openai_client.embeddings.create(input=texts, model=self._model)
		# Azure returns one datum per input, in order.
		return [datum.embedding for datum in response.data]
