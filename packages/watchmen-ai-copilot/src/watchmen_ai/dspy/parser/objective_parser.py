from watchmen_ai.dspy.model.data_story import DataStory, SubQuestion, Hypothesis, Dimension, BusinessTarget, Metric
from watchmen_ai.dspy.parser.common_parser import find_name_for_document
from watchmen_ai.dspy.parser.utils.mardown_utils import find_list_between_indices, \
    find_all_strong_content, json_to_markdown, find_first_node_by_type_and_level_and_start, \
    find_nodes_by_start_and_level, find_next_index_by_type, find_node_by_type_level_and_content, \
    find_next_index_by_header_level


class ObjectiveParser:
    def __init__(self, objective_markdown_json):
        self.objective_markdown_json = objective_markdown_json

    def find_first_objective(self):
        objective_first_node, index = find_first_node_by_type_and_level_and_start(self.objective_markdown_json,
                                                                                  "Heading", 2, "Sub-Question")

        return objective_first_node, index

    def parse(self) -> DataStory:
        if self.objective_markdown_json is None:
            raise Exception("Objective markdown json is None")

        # objective_document = ObjectiveDocument()
        data_story = DataStory()
        data_story.businessQuestion = self.find_business_target(self.objective_markdown_json)

        sub_question_list = self.find_sub_questions()

        data_story.subQuestions = sub_question_list

        dimensions = self.find_dimensions()
        # print(dimensions)

        data_story.dimensions = dimensions

        return data_story

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
                if len(cells) == 3:
                    dimension_name = cells[0].get("children", [])[0].get("content", "")
                    dimension_type = cells[1].get("children", [])[0].get("content", "")
                    dimension_description = cells[2].get("children", [])[0].get("content", "")
                    dimensions.append(
                        Dimension(name=dimension_name, description=dimension_description, dimensionType=dimension_type))
        return dimensions

    def process_sub_question_name(self, content):
        if content.startswith("Sub-Question") and ":" in content:
            return content.split(":")[1]
        else:
            return content

    def find_sub_questions(self):
        sub_question_list = find_nodes_by_start_and_level(self.objective_markdown_json, "Sub-Question", 2)

        node_list = []

        for sub_question_node, index in sub_question_list:
            sub_question = SubQuestion()

            next_header_index = find_next_index_by_header_level(self.objective_markdown_json, index, 2)

            end_index = find_next_index_by_type(self.objective_markdown_json, index, "ThematicBreak")

            sub_question_contents = find_list_between_indices(self.objective_markdown_json, index + 1,
                                                              end_index)
            sub_question_desc = json_to_markdown(sub_question_contents)
            sub_question.description = sub_question_desc
            sub_question.question = self.process_sub_question_name(sub_question_node.get("children")[0].get("content"))

            sub_question_contents = find_list_between_indices(self.objective_markdown_json, index, next_header_index)

            hypothesis_list = self.find_hypothesis(sub_question_contents)
            # hypothesis_list = self.json_to_hypothesis(sub_question_contents)
            sub_question.hypothesis = hypothesis_list
            objective_keywords = find_all_strong_content(sub_question_contents)
            # node.objective_name = sub_question_node.get("children")[0].get("content")
            node_list.append(sub_question)
        return node_list

    def find_hypothesis(self, sub_question_contents):
        hypothesis_list = find_nodes_by_start_and_level(sub_question_contents, "Hypothesis", 3)
        hypothesis_node_list = []
        for hypothesis_node, index in hypothesis_list:
            hypothesis = Hypothesis()
            end_index = find_next_index_by_type(sub_question_contents, index, "ThematicBreak")
            hypothesis.hypothesis = hypothesis_node.get("children")[0].get("content")
            hypothesis_content = find_list_between_indices(sub_question_contents, index + 1,
                                                           end_index)

            hypothesis_keywords = find_all_strong_content(hypothesis_content)

            hypothesis.description = json_to_markdown(hypothesis_content)

            hypothesis.metrics = self.convert_keywords_to_metrics(hypothesis_keywords)

            hypothesis_node_list.append(hypothesis)

        return hypothesis_node_list

    def json_to_hypothesis(self, objective_contents):

        hypothesis_list = []
        for hypothesis in objective_contents:
            hypothesis_node = Hypothesis()
            hypothesis_node.hypothesis = hypothesis.get("content")
            hypothesis_node.evidence = hypothesis.get("content")
            hypothesis_node.result = hypothesis.get("content")

            objective_keywords = find_all_strong_content(objective_contents)

            hypothesis_node.metrics = self.convert_keywords_to_metrics(objective_keywords)

            hypothesis_list.append(hypothesis_node)

        return hypothesis_list

    def convert_keywords_to_metrics(self, objective_keywords):
        keywords = list(set(objective_keywords))
        metric_list = []
        for keyword in keywords:
            metric = Metric()

            metric.name = keyword
            metric_list.append(metric)
        return metric_list

    def find_business_target(self, objective_markdown_json):

        name = find_name_for_document(objective_markdown_json)

        first_objective_node, index = self.find_first_objective()

        content_list = find_list_between_indices(self.objective_markdown_json, 1, index)

        business_target = BusinessTarget(name=name, description=json_to_markdown(content_list),
                                         keywords=find_all_strong_content(content_list))
        # return business_target
        return business_target


if __name__ == '__main__':
    with open("../doc/How Incentive Programs Improve Business Performance.md", 'r') as fin:
        markdown = fin.read()
        spliter = ObjectiveParser(markdown)
        result = spliter.parse()

        print(result.json())
