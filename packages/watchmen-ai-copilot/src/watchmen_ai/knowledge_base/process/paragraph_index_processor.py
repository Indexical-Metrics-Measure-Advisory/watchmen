"""Paragraph index processor."""
import uuid
from typing import Optional

from watchmen_ai.knowledge_base.base_index_processor import BaseIndexProcessor
from watchmen_ai.knowledge_base.clean.clean_processor import CleanProcessor
from watchmen_ai.knowledge_base.extracter.extract_processor import ExtractProcessor
from watchmen_ai.knowledge_base.indexing_runner import ExtractSetting
from watchmen_ai.model.dataset import KnowledgeDataset
from watchmen_ai.model.documents import Document


class ParagraphIndexProcessor(BaseIndexProcessor):

    def extract(self, extract_setting: ExtractSetting, **kwargs) -> list[Document]:

        text_docs = ExtractProcessor.extract(extract_setting=extract_setting,
                                             is_automatic=kwargs.get('process_rule_mode') == "automatic")

        return text_docs

    def transform(self, documents: list[Document], **kwargs) -> list[Document]:
        # Split the text documents into nodes.
        splitter = self._get_splitter(processing_rule=kwargs.get('process_rule'),
                                      embedding_model_instance=kwargs.get('embedding_model_instance'))
        all_documents = []
        for document in documents:
            # document clean
            document_text = CleanProcessor.clean(document.page_content, kwargs.get('process_rule'))
            document.page_content = document_text
            # parse document to nodes
            document_nodes = splitter.split_documents([document])
            split_documents = []
            for document_node in document_nodes:

                if document_node.page_content.strip():
                    doc_id = str(uuid.uuid4())
                    hash = ""
                    # hash = helper.generate_text_hash(document_node.page_content)
                    document_node.metadata['doc_id'] = doc_id
                    document_node.metadata['doc_hash'] = hash
                    # delete Spliter character
                    page_content = document_node.page_content
                    if page_content.startswith(".") or page_content.startswith("。"):
                        page_content = page_content[1:].strip()
                    else:
                        page_content = page_content
                    if len(page_content) > 0:
                        document_node.page_content = page_content
                        split_documents.append(document_node)
            all_documents.extend(split_documents)
        return all_documents

    def load(self, dataset: KnowledgeDataset, documents: list[Document], with_keywords: bool = True):
        if dataset.indexing_technique == 'high_quality':
            vector = Vector(dataset)
            vector.create(documents)
        if with_keywords:
            keyword = Keyword(dataset)
            keyword.create(documents)

    def clean(self, dataset: KnowledgeDataset, node_ids: Optional[list[str]], with_keywords: bool = True):
        if dataset.indexing_technique == 'high_quality':
            vector = Vector(dataset)
            if node_ids:
                vector.delete_by_ids(node_ids)
            else:
                vector.delete()
        if with_keywords:
            keyword = Keyword(dataset)
            if node_ids:
                keyword.delete_by_ids(node_ids)
            else:
                keyword.delete()

    def retrieve(self, retrival_method: str, query: str, dataset: Dataset, top_k: int,
                 score_threshold: float, reranking_model: dict) -> list[Document]:
        # Set search parameters.
        results = RetrievalService.retrieve(retrival_method=retrival_method, dataset_id=dataset.id, query=query,
                                            top_k=top_k, score_threshold=score_threshold,
                                            reranking_model=reranking_model)
        # Organize results.
        docs = []
        for result in results:
            metadata = result.metadata
            metadata['score'] = result.score
            if result.score > score_threshold:
                doc = Document(page_content=result.page_content, metadata=metadata)
                docs.append(doc)
        return docs
