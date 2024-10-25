from langchain_text_splitters import RecursiveCharacterTextSplitter

from watchmen_ai.knowledge_base.knowledge_process_service import KnowledgeBase


class KnowledgeBaseLoader:

    def load_and_split(self, knowledge_base: KnowledgeBase):
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)

        splits = text_splitter.split_documents(docs)

        pass
