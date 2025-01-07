from typing import List, Any

from watchmen_ai.lang.lang_service import get_message_by_lang
from watchmen_ai.model.chat_answer import CopilotAnswerOption


def build_yes_no_item(token: str, lang: str = "en") -> List[Any]:
    return [CopilotAnswerOption(text=get_message_by_lang(lang, "yes"), action="yes", token=token, vertical=True),
            CopilotAnswerOption(text=get_message_by_lang(lang, "no"), action="no", token=token)]
