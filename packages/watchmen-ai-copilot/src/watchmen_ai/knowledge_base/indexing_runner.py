import concurrent
import datetime
from typing import Optional, cast

import time
from pydantic import ConfigDict, BaseModel

from watchmen_ai.errors import ProviderTokenNotInitError
from watchmen_ai.knowledge_base.base_index_processor import BaseIndexProcessor
from watchmen_ai.knowledge_base.index_factory import IndexProcessorFactory
from watchmen_ai.llm.model_manager import ModelManager, ModelType
from watchmen_ai.model.dataset import KnowledgeDataset, DocumentSegment
from watchmen_ai.model.dataset_document import DatasetDocument
from watchmen_ai.model.documents import Document
from watchmen_ai.model.upload_file import UploadFile

PRE_PROCESSING_RULES = ['remove_stopwords', 'remove_extra_spaces', 'remove_urls_emails']
AUTOMATIC_RULES = {
    'pre_processing_rules': [
        {'id': 'remove_extra_spaces', 'enabled': True},
        {'id': 'remove_urls_emails', 'enabled': False}
    ],
    'segmentation': {
        'delimiter': '\n',
        'max_tokens': 500,
        'chunk_overlap': 50
    }
}


class ExtractSetting(BaseModel):
    """
    Model class for provider response.
    """
    datasource_type: str
    upload_file: Optional[UploadFile] = None
    document_model: Optional[str] = None
    model_config = ConfigDict(arbitrary_types_allowed=True)

    def __init__(self, **data) -> None:
        super().__init__(**data)


class IndexingRunner:
    def __init__(self):
        # self.storage = storage
        self.model_manager = ModelManager()

    def _sync_to_graph(self, dataset_document: KnowledgeDataset):
        ## check dataset type only process markdown_body file
        ## check header is in knowledge type list [Objective,Metrics,Subject]

        pass

    def run(self, dataset_documents: list[KnowledgeDataset]):
        """Run the indexing process."""
        for dataset_document in dataset_documents:
            try:
                # get dataset
                if dataset_document.syncToGraph:

                dataset = None  # TODO find dataset
                #     (
                #     Dataset.query.filter_by(
                #     id=dataset_document.dataset_id
                # ).first())

                if not dataset:
                    raise ValueError("no dataset found")

                # get the process rule
                processing_rule = None  # TODO add config for sync to knowledge graph

                # db.session.query(DatasetProcessRule). \
                # filter(DatasetProcessRule.id == dataset_document.dataset_process_rule_id). \
                # first()
                index_type = dataset_document.doc_form
                index_processor = IndexProcessorFactory(index_type).init_index_processor()
                # extract
                text_docs = self._extract(index_processor, dataset_document, processing_rule.to_dict())

                # transform
                documents = self._transform(index_processor, dataset, text_docs, dataset_document.doc_language,
                                            processing_rule.to_dict())
                # save segment
                self._load_segments(dataset, dataset_document, documents)

                # load
                self._load(
                    index_processor=index_processor,
                    dataset=dataset,
                    dataset_document=dataset_document,
                    documents=documents
                )
            except DocumentIsPausedException:
                raise DocumentIsPausedException('Document paused, document id: {}'.format(dataset_document.id))
            except ProviderTokenNotInitError as e:
                dataset_document.indexing_status = 'error'
                dataset_document.error = str(e.description)
                dataset_document.stopped_at = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
                db.session.commit()
            except ObjectDeletedError:
                logging.warning('Document deleted, document id: {}'.format(dataset_document.id))
            except Exception as e:
                logging.exception("consume document failed")
                dataset_document.indexing_status = 'error'
                dataset_document.error = str(e)
                dataset_document.stopped_at = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
                db.session.commit()

    def _update_document_index_status(self, document_id: str, after_indexing_status: str,
                                      extra_update_params: Optional[dict] = None) -> None:
        """
        Update the document indexing status.
        """
        count = DatasetDocument.query.filter_by(id=document_id, is_paused=True).count()
        if count > 0:
            raise DocumentIsPausedException()
        document = DatasetDocument.query.filter_by(id=document_id).first()
        if not document:
            raise DocumentIsDeletedPausedException()

        update_params = {
            DatasetDocument.indexing_status: after_indexing_status
        }

        if extra_update_params:
            update_params.update(extra_update_params)

        DatasetDocument.query.filter_by(id=document_id).update(update_params)
        db.session.commit()

    def _extract(self, index_processor: BaseIndexProcessor, dataset_document: KnowledgeDataset, process_rule: dict) \
            -> list[Document]:
        # load file
        if dataset_document.data_source_type not in ["upload_file", "notion_import", "website_crawl"]:
            return []

        data_source_info = dataset_document.data_source_info_dict
        text_docs = []
        if dataset_document.data_source_type == 'upload_file':
            if not data_source_info or 'upload_file_id' not in data_source_info:
                raise ValueError("no upload file found")

            file_detail = db.session.query(UploadFile). \
                filter(UploadFile.id == data_source_info['upload_file_id']). \
                one_or_none()

            if file_detail:
                extract_setting = ExtractSetting(
                    datasource_type="upload_file",
                    upload_file=file_detail,
                    document_model=dataset_document.doc_form
                )
                text_docs = index_processor.extract(extract_setting, process_rule_mode=process_rule['mode'])

        # update document status to splitting
        self._update_document_index_status(
            document_id=dataset_document.id,
            after_indexing_status="splitting",
            extra_update_params={
                DatasetDocument.word_count: sum(len(text_doc.page_content) for text_doc in text_docs),
                DatasetDocument.parsing_completed_at: datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
            }
        )

        # replace doc id to document model id
        text_docs = cast(list[Document], text_docs)
        for text_doc in text_docs:
            text_doc.metadata['document_id'] = dataset_document.id
            text_doc.metadata['dataset_id'] = dataset_document.dataset_id

        return text_docs

    def _transform(self, index_processor: BaseIndexProcessor, dataset: KnowledgeDataset,
                   text_docs: list[Document], doc_language: str, process_rule: dict) -> list[Document]:
        # get embedding model instance
        embedding_model_instance = None
        if dataset.indexing_technique == 'high_quality':
            if dataset.embedding_model_provider:
                embedding_model_instance = self.model_manager.get_model_instance(
                    tenant_id=dataset.tenant_id,
                    provider=dataset.embedding_model_provider,
                    model_type=ModelType.TEXT_EMBEDDING,
                    model=dataset.embedding_model
                )
            else:
                embedding_model_instance = self.model_manager.get_default_model_instance(
                    tenant_id=dataset.tenant_id,
                    model_type=ModelType.TEXT_EMBEDDING,
                )

        documents = index_processor.transform(text_docs, embedding_model_instance=embedding_model_instance,
                                              process_rule=process_rule, tenant_id=dataset.tenant_id,
                                              doc_language=doc_language)

        return documents

    def _load_segments(self, dataset, dataset_document, documents):
        # save node to document segment
        doc_store = DatasetDocumentStore(
            dataset=dataset,
            user_id=dataset_document.created_by,
            document_id=dataset_document.id
        )

        # add document segments
        doc_store.add_documents(documents)

        # update document status to indexing
        cur_time = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
        self._update_document_index_status(
            document_id=dataset_document.id,
            after_indexing_status="indexing",
            extra_update_params={
                DatasetDocument.cleaning_completed_at: cur_time,
                DatasetDocument.splitting_completed_at: cur_time,
            }
        )

        # update segment status to indexing
        self._update_segments_by_document(
            dataset_document_id=dataset_document.id,
            update_params={
                DocumentSegment.status: "indexing",
                DocumentSegment.indexing_at: datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
            }
        )

    def _update_segments_by_document(self, dataset_document_id: str, update_params: dict) -> None:
        """
        Update the document segment by document id.
        """
        DocumentSegment.query.filter_by(document_id=dataset_document_id).update(update_params)
        db.session.commit()

    def _load(self, index_processor: BaseIndexProcessor, dataset: Dataset,
              dataset_document: DatasetDocument, documents: list[Document]) -> None:
        """
        insert index and update document/segment status to completed
        """

        embedding_model_instance = None
        if dataset.indexing_technique == 'high_quality':
            embedding_model_instance = self.model_manager.get_model_instance(
                tenant_id=dataset.tenant_id,
                provider=dataset.embedding_model_provider,
                model_type=ModelType.TEXT_EMBEDDING,
                model=dataset.embedding_model
            )

        # chunk nodes by chunk size
        indexing_start_at = time.perf_counter()
        tokens = 0
        chunk_size = 10

        # create keyword index
        create_keyword_thread = threading.Thread(target=self._process_keyword_index,
                                                 args=(current_app._get_current_object(),
                                                       dataset.id, dataset_document.id, documents))
        create_keyword_thread.start()
        if dataset.indexing_technique == 'high_quality':
            with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                futures = []
                for i in range(0, len(documents), chunk_size):
                    chunk_documents = documents[i:i + chunk_size]
                    futures.append(
                        executor.submit(self._process_chunk, current_app._get_current_object(), index_processor,
                                        chunk_documents, dataset,
                                        dataset_document, embedding_model_instance))

                for future in futures:
                    tokens += future.result()

        create_keyword_thread.join()
        indexing_end_at = time.perf_counter()

        # update document status to completed
        self._update_document_index_status(
            document_id=dataset_document.id,
            after_indexing_status="completed",
            extra_update_params={
                DatasetDocument.tokens: tokens,
                DatasetDocument.completed_at: datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None),
                DatasetDocument.indexing_latency: indexing_end_at - indexing_start_at,
                DatasetDocument.error: None,
            }
        )


class DocumentIsPausedException(Exception):
    pass


class DocumentIsDeletedPausedException(Exception):
    pass
