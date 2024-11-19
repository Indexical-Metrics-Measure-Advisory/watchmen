from langchain_community.document_loaders import UnstructuredMarkdownLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from watchmen_ai.knowledge_base.knowledge_process_service import KnowledgeBase
from watchmen_ai.knowledge_base.loader.base import KnowledgeBaseLoader


class KnowledgeBaseMarkdownLoader(KnowledgeBaseLoader):

    def load_documents(self, knowledge_base: KnowledgeBase):
        loader = UnstructuredMarkdownLoader()
        docs = loader.load()
        return docs

    def load_and_split(self, knowledge_base: KnowledgeBase):
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)

        splits = text_splitter.split_documents(self.load_documents(knowledge_base))

        pass
