from typing import List, Any

from watchmen_ai.dspy.model.data_result import HypothesisDataResult
from watchmen_ai.lang.lang_service import get_message_by_lang
from watchmen_ai.model.chat_answer import CopilotAnswerOption


def build_yes_no_item(token: str, lang: str = "en") -> List[Any]:
    return [CopilotAnswerOption(text=get_message_by_lang(lang, "yes"), action="yes", token=token, vertical=True),
            CopilotAnswerOption(text=get_message_by_lang(lang, "no"), action="no", token=token)]


def convert_data_to_markdown(data_result_list: List[HypothesisDataResult], markdown_document):
    for data_result in data_result_list:
        markdown_document.append_heading(data_result["description"], 4)
        data_rows = data_result["data"]
        headers = data_rows[0].keys()
        data = [list(row.values()) for row in data_rows]
        markdown_document.append_table(headers, data)

    return markdown_document


def convert_subject_to_markdown(subject_list: List[dict], markdown_document):
    for subject in subject_list:
        markdown_document.append_heading(subject["subject_name"], 4)
        markdown_document.append_text(subject["markdown_table"])

    return markdown_document