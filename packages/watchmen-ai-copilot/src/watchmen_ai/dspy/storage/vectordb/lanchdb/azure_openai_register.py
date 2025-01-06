from functools import cached_property
from typing import List, Union

import numpy as np
from lancedb.embeddings import TextEmbeddingFunction
from lancedb.embeddings.registry import register, get_registry
from lancedb.util import attempt_import_or_raise


@register("azure_openai")
class AzureOpenAIEmbeddings(TextEmbeddingFunction):
    """
    An embedding function that uses the Azure OpenAI API
    """

    name: str = "text-embedding-ada-002"
    azure_api_key: str
    azure_endpoint: str
    azure_deployment: str
    azure_api_version: str

    def ndims(self):
        return self._ndims

    @cached_property
    def _ndims(self):
        if self.name == "text-embedding-ada-002":
            return 1536
        else:
            raise ValueError(f"Unknown model name {self.name}")

    def generate_embeddings(
            self, texts: Union[List[str], np.ndarray]
    ) -> List[np.array]:
        """
        Get the embeddings for the given texts

        Parameters
        ----------
        texts: list[str] or np.ndarray (of str)
            The texts to embed
        """
        # TODO retry, rate limit, token limit
        if self.name == "text-embedding-ada-002":
            rs = self._openai_client.embeddings.create(input=texts, model=self.name)
        else:
            rs = self._openai_client.embeddings.create(
                input=texts, model=self.name, dimensions=self.ndims()
            )
        return [v.embedding for v in rs.data]

    @cached_property
    def _openai_client(self):
        openai = attempt_import_or_raise("openai")
        return openai.AzureOpenAI(
            azure_endpoint=self.azure_endpoint,
            api_key=self.azure_api_key,
            api_version=self.azure_api_version,
            azure_deployment=self.azure_deployment
        )


azure_openai_registry = get_registry().get("azure_openai")
