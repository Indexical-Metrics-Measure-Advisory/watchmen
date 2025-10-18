


class KnowledgeService:
    """
    KnowledgeService is a class that provides methods to interact with the knowledge base.
    It allows for the retrieval of knowledge base information and the execution of queries.
    """

    def __init__(self, knowledge_base):
        """
        Initializes the KnowledgeService with a given knowledge base.

        :param knowledge_base: The knowledge base to be used by the service.
        """
        self.knowledge_base = knowledge_base

    def get_knowledge_base_info(self):
        """
        Retrieves information about the knowledge base.

        :return: Information about the knowledge base.
        """
        return self.knowledge_base.get_info()



    def find_knowledge_type(self):
        """
        Finds the type of knowledge in the knowledge base.

        :return: The type of knowledge in the knowledge base.
        """
        return self.knowledge_base.find_type()

    def search_knowledge(self, query):
        """
        Searches for knowledge in the knowledge base using a given query.

        :param query: The query to be used for searching.
        :return: The result of the search.
        """
        ## TODO
        # mock data 


        return self.knowledge_base.search(query)