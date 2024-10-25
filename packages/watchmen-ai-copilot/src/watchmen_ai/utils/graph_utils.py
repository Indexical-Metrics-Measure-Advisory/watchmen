import uuid
from enum import Enum
from typing import Tuple, List

from pydantic import BaseModel

from watchmen_ai.model.graph.graph_models import WatchmenNode, WatchmenEdge, WatchmenProperty


class WatchmenGraphWrapper(BaseModel):
    nodes: List[WatchmenNode] = []
    edges: List[WatchmenEdge] = []
    properties: List[WatchmenProperty] = []


class MarkdownType(str, Enum):
    Document = "Document"
    Heading = "Heading"
    Paragraph = "Paragraph"
    List = "List"
    CodeFence = "CodeFence"


class GraphNodeType(str, Enum):
    Metric = "Metric"
    Objective = "Objective"
    Result = "Result"
    Audience = "Audience"
    Dataset = "Dataset"
    MetricStructure = "MetricStructure"
    BusinessTarget = "BusinessTarget"


class GraphEdgeType(str, Enum):
    measured_metric = "measured_metric"
    key_objective = "key_objective"
    result = "result"
    audience = "has_audience"
    metric_structure = "metric_structure"
    has_metadata = "has_metadata"


def get_next_child(children, index):
    return children[index + 1] if index + 1 < len(children) else None


def get_list_content(children):
    content = []
    for child in children:
        if child.get("type") == "ListItem":
            sub_children = child.get("children")
            for sub_child in sub_children:
                if sub_child.get("type") == "Paragraph":
                    content.append(sub_child.get("children")[0].get("content"))

    return content


def generate_uuid() -> str:
    return uuid.uuid4().hex


def lowercase(text: str) -> str:
    return text.lower()


def find_list_between_indices(children, start_index, end_index):
    return children[start_index:end_index]


def build_key(node_type: GraphNodeType, node_id: str):
    return "{}_{}".format(node_type.value, node_id)


def find_node_by_type_level_and_content(children, type, level, content) -> Tuple:
    for index, child in enumerate(children):
        if child.get("type") == type and child.get("level") == level:
            if child.get("children")[0].get("content") == content:
                return child, index
    return None, None


def compare_node(node1: WatchmenNode, node2: WatchmenNode):
    return node1.nodeLabel == node2.nodeLabel


def build_node_key(node: WatchmenNode):
    return "{}_{}_{}".format(node.nodeLabel, lowercase(node.nodeName), node.tenantId)


def build_node_key_by_param(node_label: str, node_name: str, tenant_id: str):
    return "{}_{}_{}".format(node_label, lowercase(node_name), tenant_id)


def build_edge_key(edge: WatchmenEdge):
    return "{}_{}_{}".format(edge.edgeLabel, edge.sourceNodeID, edge.targetNodeID)


def build_edge_key_by_param(edge_label: str, source_node_id: str, target_node_id: str):
    return "{}_{}_{}".format(edge_label, source_node_id, target_node_id)


def build_property_key(property: WatchmenProperty):
    return "{}_{}".format(property.propertyName, property.nodeID)


def build_property_key_by_param(property_name: str, property_id: str):
    return "{}_{}".format(property_name, property_id)


def build_graph_dict(wrapper: WatchmenGraphWrapper):
    node_dict = {}
    edge_dict = {}
    property_dict = {}
    for node in wrapper.nodes:
        node_dict[build_node_key(node)] = node
    for edge in wrapper.edges:
        edge_dict[build_edge_key(edge)] = edge
    for property_node in wrapper.properties:
        property_dict[build_property_key(property_node)] = property_node
    return node_dict, edge_dict, property_dict


def convert_dict_to_wrapper(node_dict, edge_dict, property_dict):
    nodes = []
    edges = []
    properties = []
    for key in node_dict:
        nodes.append(node_dict[key])
    for key in edge_dict:
        edges.append(edge_dict[key])
    for key in property_dict:
        properties.append(property_dict[key])
    return WatchmenGraphWrapper(nodes=nodes, edges=edges, properties=properties)
