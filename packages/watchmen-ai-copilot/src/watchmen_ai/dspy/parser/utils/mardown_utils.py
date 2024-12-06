import uuid
from typing import Tuple, List


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


# def build_key(node_type: GraphNodeType, node_id: str):
#     return "{}_{}".format(node_type.value, node_id)


def find_node_by_type_level_and_content(children, markdown_type, level, content) -> Tuple:
    for index, child in enumerate(children):
        if child.get("type") == markdown_type and child.get("level") == level:
            if child.get("children")[0].get("content") == content:
                return child, index
    return None, None


def find_first_node_by_type_and_level_and_start(children, markdown_type, level, start) -> Tuple:
    for index, child in enumerate(children):
        if child.get("type") == markdown_type and child.get("level") == level:
            if child.get("children")[0].get("content").startswith(start):
                return child, index
    return None, None


def find_all_strong_content(children):
    strong_content = []
    for child in children:
        if child.get("type") == "Strong":
            strong_content.append(child.get("children")[0].get("content"))
        elif "children" in child:
            strong_content.extend(find_all_strong_content(child.get("children")))
    return strong_content


def json_to_markdown(children):
    markdown = []
    for child in children:
        if child.get("type") == "RawText":
            markdown.append(child.get("content"))
        elif child.get("type") == "Strong":
            markdown.append(f"**{child.get('children')[0].get('content')}**")
        elif child.get("type") == "Paragraph":
            markdown.append(json_to_markdown(child.get("children")))
            markdown.append("\n\n")
        elif child.get("type") == "Heading":
            level = child.get("level")
            content = child.get("children")[0].get("content")
            markdown.append(f"{'#' * level} {content}\n\n")
        elif child.get("type") == "List":
            markdown.append(f"{json_to_markdown(child.get('children'))}\n")
        elif child.get("type") == "ListItem":
            markdown.append(f"- {json_to_markdown(child.get('children'))}\n")
        elif child.get("type") == "ThematicBreak":
            markdown.append("\n---\n")
        elif "children" in child:
            markdown.append(json_to_markdown(child.get("children")))
    return ''.join(markdown)


# def find_node_by_start_and_level(child, start, level) -> Tuple:
#     if child.get("type") == "Heading" and child.get("level") == level:
#         if child.get("children")[0].get("content").startswith(start):
#             return child


def find_nodes_by_start_and_level(children, start, level) -> List:
    nodes = []
    for index, child in enumerate(children):
        if child.get("type") == "Heading" and child.get("level") == level:
            if child.get("children")[0].get("content").startswith(start):
                nodes.append((child, index))
    return nodes


def find_next_index_by_type(children, index, markdown_type):
    for i in range(index, len(children)):
        if children[i].get("type") == markdown_type:
            return i
    return None


def find_next_index_by_header_level(children, index, level):
    for i in range(index + 1, len(children)):
        if children[i].get("type") == "Heading" and children[i].get("level") == level:
            return i
    return None

#
# def compare_node(node1: WatchmenNode, node2: WatchmenNode):
#     return node1.nodeLabel == node2.nodeLabel
#
#
# def build_node_key(node: WatchmenNode):
#     return "{}_{}_{}".format(node.nodeLabel, lowercase(node.nodeName), node.tenantId)
#
#
# def build_node_key_by_param(node_label: str, node_name: str, tenant_id: str):
#     return "{}_{}_{}".format(node_label, lowercase(node_name), tenant_id)
#
#
# def build_edge_key(edge: WatchmenEdge):
#     return "{}_{}_{}".format(edge.edgeLabel, edge.sourceNodeID, edge.targetNodeID)


# def build_edge_key_by_param(edge_label: str, source_node_id: str, target_node_id: str):
#     return "{}_{}_{}".format(edge_label, source_node_id, target_node_id)


# def build_property_key(property: WatchmenProperty):
#     return "{}_{}".format(property.propertyName, property.nodeID)
#

# def build_property_key_by_param(property_name: str, property_id: str):
#     return "{}_{}".format(property_name, property_id)


# def build_graph_dict(wrapper: WatchmenGraphWrapper):
#     node_dict = {}
#     edge_dict = {}
#     property_dict = {}
#     for node in wrapper.nodes:
#         node_dict[build_node_key(node)] = node
#     for edge in wrapper.edges:
#         edge_dict[build_edge_key(edge)] = edge
#     for property_node in wrapper.properties:
#         property_dict[build_property_key(property_node)] = property_node
#     return node_dict, edge_dict, property_dict
#

# def convert_dict_to_wrapper(node_dict, edge_dict, property_dict):
#     nodes = []
#     edges = []
#     properties = []
#     for key in node_dict:
#         nodes.append(node_dict[key])
#     for key in edge_dict:
#         edges.append(edge_dict[key])
#     for key in property_dict:
#         properties.append(property_dict[key])
#     return WatchmenGraphWrapper(nodes=nodes, edges=edges, properties=properties)
