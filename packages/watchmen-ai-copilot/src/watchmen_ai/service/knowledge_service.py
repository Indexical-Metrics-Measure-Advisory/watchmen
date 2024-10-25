class KnowledgeGraphService:

    def find_objective_by_intent(self, query_intent: str) -> str:
        # find result from vector db by query intent  limit is 2?
        # use node id find data in graph db
        # base on the question and graph db build result in markdown

        pass


knowledge_graph_service = KnowledgeGraphService()
knowledge_graph_service.find_objective_by_intent("sales trend of the last 3 months")
