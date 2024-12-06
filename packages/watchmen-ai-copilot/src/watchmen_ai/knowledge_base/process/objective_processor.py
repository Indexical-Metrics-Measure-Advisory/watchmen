import json
from typing import Dict, List, Tuple

from watchmen_model.common import TenantId
from watchmen_model.common.tuple_ids import DocumentId

from watchmen_ai.knowledge_base.process.common_processor_service import get_all_document_nodes, find_name_for_document, \
    CHILDREN, TYPE
from watchmen_ai.model.graph.graph_models import WatchmenProperty, WatchmenNode, WatchmenEdge
from watchmen_ai.utils.graph_utils import get_next_child, get_list_content, generate_uuid, GraphNodeType, \
    find_list_between_indices, find_node_by_type_level_and_content, MarkdownType, WatchmenGraphWrapper, lowercase, \
    GraphEdgeType, build_graph_dict, build_node_key_by_param, build_property_key_by_param, \
    build_edge_key_by_param, convert_dict_to_wrapper, find_node_by_start_and_level


def find_meta_info(children: List) -> Dict:
    meta_info = {}
    node, index = find_node_by_type_level_and_content(children, MarkdownType.Heading, 2, "Metadata Information")
    meta_info_node = get_next_child(children, index)
    if meta_info_node[TYPE] == MarkdownType.Paragraph:
        for child in meta_info_node.get(CHILDREN):
            if child.get(TYPE) == "RawText":
                content = child.get("content")
                key_value = content.split(":")
                meta_info[lowercase(key_value[0])] = key_value[1]

    return meta_info


def create_header_node(name: str, tenant_id: str, document_id: DocumentId) -> WatchmenNode:
    node = WatchmenNode(nodeId=generate_uuid(), nodeLabel=GraphNodeType.BusinessTarget.value, tenantId=tenant_id,
                        documentId=document_id, nodeName=name)
    node.nodeProperties = {"name": name}
    return node


def find_objective(children: List) -> Tuple:
    return find_node_by_type_level_and_content(children, MarkdownType.Heading, 3, "Objective")


def find_context(children: List) -> Tuple:
    return find_node_by_type_level_and_content(children, MarkdownType.Heading, 2, "Context")


def get_metric_node(children: List):
    node, index = find_node_by_type_level_and_content(children, MarkdownType.Heading, 3, "Metrics")
    return get_next_child(children, index)


def process_objective(objective_node: Dict):
    # TODO : implement this
    objective_list = [
        {"node_name": "Identify Market Trends and Product Performance",
         "description": "pot high-growth and declining products to inform resource allocation and product portfolio management."},
        {"node_name": "Optimize Marketing Strategies",
         "description": "ailor marketing campaigns to promote high-performing products and rejuvenate declining ones, and adjust product positioning."},
        {"node_name": "Enhance Customer Satisfaction and Loyalty",
         "description": "Identify key customer segments for personalized marketing efforts and improve CRM strategies."},
        {"node_name": "Forecasting and Planning",
         "description": "Predict future trends for inventory management, production planning, and strategic planning."},
        {"node_name": "Improve Decision-Making Accuracy",
         "description": "Make informed decisions across various areas, including product development, marketing, and supply chain management."}

    ]

    return objective_list


## AI help to find the node_name list

def process_objective_results(result_node: Dict):
    # TODO : implement this

    pass


def check_excited_wrapper(excited_wrapper: WatchmenGraphWrapper):
    if excited_wrapper is None:
        return WatchmenGraphWrapper()
    return excited_wrapper


def find_objectives(markdown_children: List):
    objectives = []
    for index, child in enumerate(markdown_children):
        objective_node = find_node_by_start_and_level(child, "Objective:", 2)
        if objective_node:
            objectives.append({"index": index, "node": objective_node})
    return objectives


def build_objective_node(objective_markdown):
    objective_name = objective_markdown.get("node_name")

    objective_content = get_list_content(objective_markdown.get(CHILDREN))

    print(objective_content)

    return build_node(objective_markdown.get("node_name"), GraphNodeType.Objective, objective_markdown.get("node_name"))


def process_objective_graph(markdown_json: json, tenant_id: TenantId, document_id: DocumentId,
                            excited_wrapper: WatchmenGraphWrapper) -> WatchmenGraphWrapper:
    wrapper = check_excited_wrapper(excited_wrapper)

    node_dict, edge_dict, properties_dict = build_graph_dict(wrapper)

    # find name for current node_name
    markdown_children = get_all_document_nodes(markdown_json)

    root_node = build_root_node(document_id, markdown_children, tenant_id, node_dict)

    # find meta info for document

    # meta_info = find_meta_info(markdown_children)
    # # TODO : implement this
    # meta_info_with_keywords = process_key_words(meta_info)
    # root_node.nodeProperties = meta_info

    # build properties node for meta info and add edge

    # for meta_info_key, meta_info_value in meta_info.items():
    #     watchmen_property = build_property_node(root_node.nodeId, meta_info_key, meta_info_value, tenant_id,
    #                                             document_id, properties_dict)

    # wrapper.properties.append(watchmen_property)

    # find all objectives in the markdown_body
    objectives_nodes = find_objectives(markdown_children)

    print(objectives_nodes)

    for objective_node in objectives_nodes:
        build_objective_node(objective_node)

    context_markdown_node, end_index = find_context(markdown_children)

    # context_list = get_list_content(get_next_child(markdown_children, end_index).get(CHILDREN))
    # TODO
    # for audience in context_list:
    #     context_node = build_audience_node(audience, tenant_id, document_id, node_dict)
    #     build_edge_node(GraphEdgeType.audience, root_node.nodeId, context_node.nodeId, tenant_id, document_id,
    #                     edge_dict)

    # add audience node and edge

    objective_content_list = find_list_between_indices(markdown_children, start_index, end_index)
    objective_list = process_objective(objective_content_list)

    # add node_name node and edge
    for objective in objective_list:
        objective_node = build_objective_node(objective.get("node_name"), tenant_id, document_id, node_dict)

        build_edge_node(GraphEdgeType.key_objective, root_node.nodeId, objective_node.nodeId, tenant_id, document_id,
                        edge_dict)

    metrics_markdown_node = get_metric_node(markdown_children)

    metrics_list = get_list_content(metrics_markdown_node.get(CHILDREN))

    # add metrics node and edge
    for metric in metrics_list:
        metric_node = build_metric_node(metric, tenant_id, document_id, node_dict)
        build_edge_node(GraphEdgeType.measured_metric, root_node.nodeId, metric_node.nodeId, tenant_id, document_id,
                        edge_dict)

    # find metrics structure for the node_name TODO : implement this

    # build properties node for objective_list and add edge

    ## exctract Methodology for the node_name
    ## exctract Metrics Structure for the node_name

    # extract Results for the node_name
    result_header_node, index = find_node_by_type_level_and_content(markdown_children, MarkdownType.Heading, 2,
                                                                    "Results")
    result_node = get_next_child(markdown_children, index)
    process_objective_results(result_node)

    # header_info = self.get_document_header_info(markdown_json)

    # print(markdown_json)
    wrapper = convert_dict_to_wrapper(node_dict, edge_dict, properties_dict)

    return wrapper


def build_root_node(document_id, markdown_children, tenant_id, node_dict: Dict):
    name = find_name_for_document(markdown_children)
    key = build_node_key_by_param(GraphNodeType.BusinessTarget.value, name, tenant_id)
    if key not in node_dict:
        root_node = create_header_node(name, tenant_id, document_id)
        node_dict[key] = root_node
        return root_node
    else:
        return node_dict[key]


def build_metric_node(metric, tenant_id, document_id, node_dict: Dict):
    key = build_node_key_by_param(GraphNodeType.Metric.value, metric, tenant_id)
    return build_node(document_id, key, GraphNodeType.Metric, node_dict, metric, tenant_id)


def build_objective_node(objective, tenant_id, document_id, node_dict: Dict):
    key = build_node_key_by_param(GraphNodeType.Objective.value, objective, tenant_id)
    return build_node(document_id, key, GraphNodeType.Objective, node_dict, objective, tenant_id)


def build_node(document_id, key, node_type, node_dict, node_name, tenant_id):
    if key not in node_dict:
        objective_node = WatchmenNode(nodeId=generate_uuid(), nodeLabel=node_type, nodeName=node_name,
                                      nodeProperties={"name": node_name}, tenantId=tenant_id, documentId=document_id)
        node_dict[key] = objective_node
        return objective_node
    else:
        return node_dict[key]


def build_audience_node(audience, tenant_id, document_id, node_dict: Dict):
    key = build_node_key_by_param(GraphNodeType.Audience.value, audience, tenant_id)
    return build_node(document_id, key, GraphNodeType.Audience, node_dict, audience, tenant_id)


def build_edge_node(label: str, source_id: str, target_id: str, tenant_id, document_id, edge_dict: Dict):
    key = build_edge_key_by_param(label, source_id, target_id)
    if key not in edge_dict:
        edge = WatchmenEdge(edgeId=generate_uuid(), edgeLabel=label, sourceNodeID=source_id, targetNodeID=target_id,
                            tenantId=tenant_id, documentId=document_id)
        edge_dict[key] = edge
        return edge
    else:
        return edge_dict[key]


def build_property_node(node_id, property_name, property_value, tenant_id, document_id, properties_dict: Dict):
    key = build_property_key_by_param(property_name, node_id)

    if key not in properties_dict:
        watchmen_property = WatchmenProperty(propertyId=generate_uuid(), nodeID=node_id, propertyName=property_name,
                                             propertyValue=property_value, tenantId=tenant_id, documentId=document_id)
        properties_dict[key] = watchmen_property
        return watchmen_property
    else:
        properties_dict[key].propertyValue = property_value
        return properties_dict[key]
