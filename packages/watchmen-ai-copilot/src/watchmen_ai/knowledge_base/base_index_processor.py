"""Abstract interface for document loader implementations."""
from abc import ABC, abstractmethod
from typing import Optional

from watchmen_ai.knowledge_base.indexing_runner import ExtractSetting, AUTOMATIC_RULES
from watchmen_ai.knowledge_base.spiltter.fix_text_spiltter import FixedRecursiveCharacterTextSplitter, \
    EnhanceRecursiveCharacterTextSplitter
from watchmen_ai.knowledge_base.spiltter.text_spiltter import TextSplitter
from watchmen_ai.llm.model_manager import ModelInstance
from watchmen_ai.model.dataset import KnowledgeDataset
from watchmen_ai.model.documents import Document


class BaseIndexProcessor(ABC):
    """Interface for extract files.
    """

    #
    @abstractmethod
    def extract(self, extract_setting: ExtractSetting, **kwargs) -> list[Document]:
        raise NotImplementedError

    @abstractmethod
    def transform(self, documents: list[Document], **kwargs) -> list[Document]:
        raise NotImplementedError

    @abstractmethod
    def load(self, dataset: KnowledgeDataset, documents: list[Document], with_keywords: bool = True):
        raise NotImplementedError

    def clean(self, dataset: KnowledgeDataset, node_ids: Optional[list[str]], with_keywords: bool = True):
        raise NotImplementedError

    @abstractmethod
    def retrieve(self, retrival_method: str, query: str, dataset: KnowledgeDataset, top_k: int,
                 score_threshold: float, reranking_model: dict) -> list[Document]:
        raise NotImplementedError

    def _get_splitter(self, processing_rule: dict,
                      embedding_model_instance: Optional[ModelInstance]) -> TextSplitter:
        """
        Get the NodeParser object according to the processing rule.
        """
        if processing_rule['mode'] == "custom":
            # The user-defined segmentation rule
            rules = processing_rule['rules']
            segmentation = rules["segmentation"]
            max_segmentation_tokens_length = 1000
            if segmentation["max_tokens"] < 50 or segmentation["max_tokens"] > max_segmentation_tokens_length:
                raise ValueError(f"Custom segment length should be between 50 and {max_segmentation_tokens_length}.")

            separator = segmentation["separator"]
            if separator:
                separator = separator.replace('\\n', '\n')

            character_splitter = FixedRecursiveCharacterTextSplitter.from_encoder(
                chunk_size=segmentation["max_tokens"],
                chunk_overlap=segmentation.get('chunk_overlap', 0),
                fixed_separator=separator,
                separators=["\n\n", "。", ". ", " ", ""],
                embedding_model_instance=embedding_model_instance
            )
        else:
            # Automatic segmentation
            character_splitter = EnhanceRecursiveCharacterTextSplitter.from_encoder(
                chunk_size=AUTOMATIC_RULES['segmentation']['max_tokens'],
                chunk_overlap=AUTOMATIC_RULES['segmentation']['chunk_overlap'],
                separators=["\n\n", "。", ". ", " ", ""],
                embedding_model_instance=embedding_model_instance
            )

        return character_splitter
