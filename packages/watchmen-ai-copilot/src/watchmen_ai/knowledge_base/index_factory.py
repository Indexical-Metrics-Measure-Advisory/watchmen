from enum import Enum

from watchmen_ai.knowledge_base.base_index_processor import BaseIndexProcessor
from watchmen_ai.knowledge_base.process.paragraph_index_processor import ParagraphIndexProcessor


class IndexType(Enum):
    PARAGRAPH_INDEX = "text_model"
    QA_INDEX = "qa_model"
    PARENT_CHILD_INDEX = "parent_child_index"
    SUMMARY_INDEX = "summary_index"


class IndexProcessorFactory:
    """IndexProcessorInit.
    """

    def __init__(self, index_type: str):
        self._index_type = index_type

    def init_index_processor(self) -> BaseIndexProcessor:
        """Init index processor."""

        if not self._index_type:
            raise ValueError("Index type must be specified.")

        if self._index_type == IndexType.PARAGRAPH_INDEX.value:
            return ParagraphIndexProcessor()
        elif self._index_type == IndexType.QA_INDEX.value:
            pass

            # return QAIndexProcessor()
        else:
            raise ValueError(f"Index type {self._index_type} is not supported.")
