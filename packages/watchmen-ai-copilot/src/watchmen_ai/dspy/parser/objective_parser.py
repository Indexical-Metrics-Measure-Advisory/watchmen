from watchmen_ai.dspy.model.objective_document import ObjectiveDocument, BusinessTargetNode, ObjectiveNode, MetricNode, \
    DimensionNode
from watchmen_ai.dspy.parser.common_parser import find_name_for_document
from watchmen_ai.dspy.parser.utils.mardown_utils import find_list_between_indices, \
    find_all_strong_content, json_to_markdown, find_first_node_by_type_and_level_and_start, \
    find_nodes_by_start_and_level, find_next_index_by_type, find_node_by_type_level_and_content


class ObjectiveParser:
    def __init__(self, objective_markdown_json):
        self.objective_markdown_json = objective_markdown_json

    def find_first_objective(self):
        objective_first_node, index = find_first_node_by_type_and_level_and_start(self.objective_markdown_json,
                                                                                  "Heading", 2, "Objective")

        return objective_first_node, index

    def parse(self) -> ObjectiveDocument:
        if self.objective_markdown_json is None:
            raise Exception("Objective markdown json is None")

        objective_document = ObjectiveDocument()
        objective_document.business_target = self.find_business_target(self.objective_markdown_json)

        ## find objectives in the markdown json
        objective_markdown_json_list = self.find_objectives()

        objective_document.objectives = objective_markdown_json_list
        # TODO find dimensions

        dimensions = self.find_dimensions()

        objective_document.dimensions = dimensions

        ## if document includes  visualizations mapping section, find the visualizations mapping

        ## if document includes  assets mapping section, find the assets mapping

        return objective_document

    def find_dimensions(self):
        dimension_header, index = find_node_by_type_level_and_content(self.objective_markdown_json, "Heading", 2,
                                                                      "Observations Dimensions")

        if dimension_header:
            end_index = find_next_index_by_type(self.objective_markdown_json, index, "ThematicBreak")
            dimension_contents = find_list_between_indices(self.objective_markdown_json, index + 1, end_index)
            dimensions = self.convert_json_to_dimension_list(dimension_contents)
            return dimensions
        return []

    def convert_json_to_dimension_list(self, json_data):
        dimensions = []
        if json_data and json_data[0].get("type") == "Table":
            table = json_data[0]
            for row in table.get("children", []):
                cells = row.get("children", [])
                if len(cells) == 2:
                    dimension_name = cells[0].get("children", [])[0].get("content", "")
                    dimension_description = cells[1].get("children", [])[0].get("content", "")
                    dimensions.append(DimensionNode(name=dimension_name, description=dimension_description))
        return dimensions

    def find_objectives(self):
        objective_nodes = find_nodes_by_start_and_level(self.objective_markdown_json, "Objective", 2)
        node_list = []
        for objective_node, index in objective_nodes:
            node = ObjectiveNode()
            end_index = find_next_index_by_type(self.objective_markdown_json, index, "ThematicBreak")
            objective_contents = find_list_between_indices(self.objective_markdown_json, index + 1, end_index)
            objective_desc = json_to_markdown(objective_contents)
            objective_keywords = find_all_strong_content(objective_contents)
            node.objective_name = objective_node.get("children")[0].get("content")
            node.metrics = self.convert_keywords_to_metrics(objective_keywords)
            node.description = objective_desc
            node_list.append(node)
        return node_list

    def convert_keywords_to_metrics(self, objective_keywords):
        keywords = list(set(objective_keywords))
        metric_list = []
        for keyword in keywords:
            metric = MetricNode()
            metric.name = keyword
            metric_list.append(metric)
        return metric_list

    def find_business_target(self, objective_markdown_json):

        name = find_name_for_document(objective_markdown_json)

        first_objective_node, index = self.find_first_objective()

        content_list = find_list_between_indices(self.objective_markdown_json, 1, index)

        business_target = BusinessTargetNode(name=name, description=json_to_markdown(content_list),
                                             keywords=find_all_strong_content(content_list))
        # return business_target
        return business_target
