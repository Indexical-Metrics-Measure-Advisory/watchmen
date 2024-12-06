import json

from watchmen_model.common.tuple_ids import DocumentId

from watchmen_ai.knowledge_base.loader.parse.markdown_parser import Markdown
from watchmen_ai.knowledge_base.process.objective_processor import process_objective_graph
from watchmen_ai.model.knowledge_base import KnowledgeType
from watchmen_ai.utils.graph_utils import WatchmenGraphWrapper

KEYWORDS = "keywords"

TYPE = "type"

LEVEL = "level"

CHILDREN = "children"


class KnowledgeGraphProcessor:

    @staticmethod
    def _convert_markdown_to_json(markdown_body: str) -> json:
        return Markdown().markdown_parse_body(markdown_body)

    def __process_metric_graph(self, markdown_json: json) -> WatchmenGraphWrapper:
        print(markdown_json)

        pass

    def __find_graph_processor(self, knowledge_type: KnowledgeType):
        if knowledge_type == KnowledgeType.METRIC:
            return self.__process_metric_graph
        elif knowledge_type == KnowledgeType.OBJECTIVE:
            return process_objective_graph
        elif knowledge_type == KnowledgeType.MART:
            pass
        elif knowledge_type == KnowledgeType.DATASET:
            pass
        else:
            raise Exception("Knowledge type not supported")

    def extract_knowledge_graph(self, markdown_body: str, knowledge_type: KnowledgeType,
                                tenant_id: str, document_id: DocumentId,
                                source_wrapper: WatchmenGraphWrapper = None) -> WatchmenGraphWrapper:

        markdown_json: json = self._convert_markdown_to_json(markdown_body)

        print(markdown_json)

        graph_processor = self.__find_graph_processor(knowledge_type)
        if graph_processor:
            return graph_processor(markdown_json, tenant_id, document_id, source_wrapper)

        return WatchmenGraphWrapper()


if __name__ == '__main__':
    with open("../../../../test/How Incentive Programs Improve Business Performance.md", 'r') as fin:
        markdown = fin.read()
        print(KnowledgeGraphProcessor().extract_knowledge_graph(markdown, KnowledgeType.OBJECTIVE))
