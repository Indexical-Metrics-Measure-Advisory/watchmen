from watchmen_ai.event.knowledge_base_events import knowledge_graph_inserted
from watchmen_ai.knowledge_base.process.knowledge_graph_processor import KnowledgeGraphProcessor
from watchmen_ai.meta.document_service import KnowledgeDocumentService
from watchmen_ai.meta.graph_service import KnowledgeGraphNodeService, KnowledgeGraphEdgeService, \
    KnowledgeGraphPropertyService
from watchmen_ai.model.dataset_document import DatasetDocument
from watchmen_ai.model.knowledge_base import KnowledgeType
from watchmen_ai.utils.graph_utils import WatchmenGraphWrapper, generate_uuid
from watchmen_auth import PrincipalService
from watchmen_indicator_surface.util import trans, trans_readonly
from watchmen_meta.common import ask_snowflake_generator, ask_meta_storage, ask_super_admin


def load_graph_edge_service(node_service: KnowledgeGraphNodeService) -> KnowledgeGraphEdgeService:
    return KnowledgeGraphEdgeService(node_service.storage, node_service.snowflakeGenerator,
                                     node_service.principalService)


def load_graph_property_service(node_service: KnowledgeGraphNodeService) -> KnowledgeGraphPropertyService:
    return KnowledgeGraphPropertyService(node_service.storage, node_service.snowflakeGenerator,
                                         node_service.principalService)


def load_graph_node_service(principal_service: PrincipalService) -> KnowledgeGraphNodeService:
    return KnowledgeGraphNodeService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def load_document_service(principal_service: PrincipalService):
    return KnowledgeDocumentService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


class KnowledgeProcessService:

    def __init__(self):
        self.processor = KnowledgeGraphProcessor()

    def __save_knowledge_graph(self, graph_wrapper: WatchmenGraphWrapper, principal_service: PrincipalService):
        node_service = load_graph_node_service(principal_service)

        def save_all_wrapper(graph_wrapper: WatchmenGraphWrapper):
            if graph_wrapper.nodes:
                for graph_node in graph_wrapper.nodes:
                    db_node = node_service.find_by_id(graph_node.nodeId)
                    if db_node:
                        node_service.update(graph_node)
                    else:
                        node_service.create(graph_node)
            edge_service = load_graph_edge_service(node_service)
            property_service = load_graph_property_service(node_service)
            if graph_wrapper.edges:
                for edge in graph_wrapper.edges:
                    db_edge = edge_service.find_by_id(edge.edgeId)
                    if db_edge:
                        edge_service.update(edge)
                    else:
                        edge_service.create(edge)

            if graph_wrapper.properties:
                for property_node in graph_wrapper.properties:
                    db_property = property_service.find_by_id(property_node.propertyId)
                    if db_property:
                        property_service.update(property_node)
                    else:
                        property_service.create(property_node)

        return trans(node_service, lambda: save_all_wrapper(graph_wrapper))

    def load_graph_wrapper(self, document_name: str, knowledge_type: KnowledgeType,
                           principal_service: PrincipalService) -> WatchmenGraphWrapper:
        document_service = load_document_service(principal_service)

        def load_document(document_name: str):
            return document_service.find_by_name(document_name, principal_service.tenantId)

        document = trans_readonly(document_service, lambda: load_document(document_name))
        node_service = load_graph_node_service(principal_service)

        def load_all_for_wrapper(document: DatasetDocument):
            wrapper = WatchmenGraphWrapper()
            wrapper.nodes = node_service.find_by_document_id(document.documentId)
            edge_service = load_graph_edge_service(node_service)
            property_service = load_graph_property_service(node_service)
            wrapper.edges = edge_service.find_by_document_id(document.documentId)
            wrapper.properties = property_service.find_by_document_id(document.documentId)
            return wrapper

        return trans_readonly(node_service, lambda: load_all_for_wrapper(document))

    def save_document_dataset(self, document_name: str, document_type: str, document_content: str,
                              principal_service: PrincipalService):
        document_service = load_document_service(principal_service)

        def create_document(document_dataset):
            return document_service.create(document_dataset)

        document_dataset = DatasetDocument(documentId=generate_uuid(), documentName=document_name,
                                           documentType=document_type,
                                           documentContent=bytes(document_content, encoding='utf8'),
                                           tenantId=principal_service.tenantId)

        return trans(document_service, lambda: create_document(document_dataset))

    def load_document_dataset(self, document_name: str, principal_service: PrincipalService):
        document_service = load_document_service(principal_service)

        def load_document(document_name: str):
            return document_service.find_by_name(document_name, principal_service.tenantId)

        return trans_readonly(document_service, lambda: load_document(document_name))

    def process_markdown(self, markdown_content: str, knowledge_type: KnowledgeType, document_id: str,
                         principal_service: PrincipalService):
        graph_wrapper = self.processor.extract_knowledge_graph(markdown_content, knowledge_type,
                                                               principal_service.tenantId, document_id)

        self.__save_knowledge_graph(graph_wrapper, principal_service)

    def merge_knowledge_graph(self, markdown: str, knowledge_type: KnowledgeType, source_wrapper: WatchmenGraphWrapper,
                              document_id: str, principal_service: PrincipalService):

        target_graph_wrapper = self.processor.extract_knowledge_graph(markdown, knowledge_type,
                                                                      principal_service.tenantId, document_id,
                                                                      source_wrapper)

        self.__save_knowledge_graph(target_graph_wrapper, principal_service)

        knowledge_graph_inserted.send(target_graph_wrapper)

        print("knowledge graph")


    def sync_insert_data_to_knowledge_graph(self, graph_wrapper: WatchmenGraphWrapper, principal_service: PrincipalService):
        knowledge_graph_inserted.send(graph_wrapper)


if __name__ == '__main__':
    knowledge_process_service = KnowledgeProcessService()
    # document_set = knowledge_process_service.load_document_dataset(
    #     "How Incentive Programs Improve Business Performance", ask_super_admin())
    #
    # wrapper: WatchmenGraphWrapper = knowledge_process_service.load_graph_wrapper(
    #     "How Incentive Programs Improve Business Performance", KnowledgeType.OBJECTIVE, ask_super_admin())
    #
    #
    # knowledge_process_service.sync_insert_data_to_knowledge_graph(wrapper, ask_super_admin())
    #
    # # knowledge_process_service.merge_knowledge_graph(document_set.documentContent.decode("utf-8"),
    # #                                                 KnowledgeType.OBJECTIVE, wrapper, document_set.documentId,
    # #                                                 ask_super_admin())


    #
    with open("../../../test/How Incentive Programs Improve Business Performance.md", 'r') as fin:
        markdown = fin.read()

        markdown = fin.read()
        #

        document_set: DatasetDocument = knowledge_process_service.save_document_dataset(
                 "How Incentive Programs Improve Business Performance.md", "Objecitive", markdown, ask_super_admin())

        #
        knowledge_process_service.process_markdown(markdown, KnowledgeType.OBJECTIVE, document_set.documentId,
                                                   ask_super_admin())


    print("done")


    #
