import json
from enum import Enum
from typing import List

from watchmen_ai.dspy.model.data_story import DataStory
from watchmen_ai.dspy.parser.common_parser import find_name_for_document
from watchmen_ai.dspy.parser.objective_parser import ObjectiveParser
from watchmen_ai.dspy.tools.markdown_json_converter import Markdown


class DocumentType(Enum):
    OBJECTIVE = "objective"
    DIMENSION = "dimension"
    METRIC = "metric"
    VISUALIZATION = "visualization"


CHILDREN = "children"


def is_data_story_objective(name):
    return name.startswith("Data Story")


class DataStorySpliter:

    def __init__(self, data):
        self.data = data.decode("utf-8")

    def __process_objective(self, markdown_json: json):
        return ObjectiveParser(markdown_json).parse()

    def split(self) -> DataStory:

        markdown_json = self._convert_markdown_to_json()

        name = find_name_for_document(markdown_json)
        if is_data_story_objective(name):
            return self.__process_objective(markdown_json)
        else:
            raise Exception("Document type not supported")

    def _convert_markdown_to_json(self) -> json:
        return self.__get_all_document_nodes(Markdown().markdown_parse_body(self.data))

    def __get_all_document_nodes(self, markdown_json: json) -> List:
        children = markdown_json[CHILDREN]
        return children


if __name__ == '__main__':
    with open("../doc/How Incentive Programs Improve Business Performance.md", 'r') as fin:
        markdown = fin.read()
        spliter = DataStorySpliter(markdown)
        result = spliter.split()

        print(result.json())
