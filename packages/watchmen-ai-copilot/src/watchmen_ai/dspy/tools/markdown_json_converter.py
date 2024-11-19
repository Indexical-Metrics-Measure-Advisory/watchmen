import json

import mistletoe
from watchmen_ai.dspy.tools.markdown_parser import MarkdownParser
from mistletoe.ast_renderer import AstRenderer


class Markdown(MarkdownParser):

    def markdown_parse(self, markdown_path: str):
        with open(markdown_path, 'r') as fin:
            rendered = mistletoe.markdown(fin, AstRenderer)
            return json.loads(rendered)

    def markdown_parse_body(self, markdown: str):
        rendered = mistletoe.markdown(markdown, AstRenderer)
        return json.loads(rendered)

    # def get_markdown_json_type(self, json):
    #     return json.get("children")[0].get("children")[0].get("type")
