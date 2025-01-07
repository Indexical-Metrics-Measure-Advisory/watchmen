class KnowledgeBaseLoader:

    def load(self):
        self.load_categories()
        self.load_articles()

    def load_categories(self):
        raise NotImplementedError

    def load_articles(self):
        raise NotImplementedError
