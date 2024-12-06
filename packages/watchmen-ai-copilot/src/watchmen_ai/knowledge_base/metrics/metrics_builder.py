from langchain_community.cache import SQLiteCache


class MetricsBuilder:
    def __init__(self, knowledge_base, model):
        self.knowledge_base = knowledge_base

    def build(self, markdown_json):
        pass


SQLiteCache
