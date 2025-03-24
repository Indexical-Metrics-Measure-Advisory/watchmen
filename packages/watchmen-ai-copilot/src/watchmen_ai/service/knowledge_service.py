class KnowledgeGraphService:


    def get_vector_service(self):
        pass

    def get_metrics_service(self):
        pass



    def find_objective_by_intent(self, query_intent: str) -> str:
        # find result from vector db by query intent  limit is 2?
        # use node id find data in graph db
        # base on the question and graph db build result in markdown

        pass


    def find_metrics_by_intent(self, query_intent: str) -> str:
        # find result from vector db by query intent  limit is 2?
        # use node id find data in graph db
        # base on the question and graph db build result in markdown

        pass


knowledge_graph_service = KnowledgeGraphService()