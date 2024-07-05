from langchain_core.language_models import BaseLanguageModel

from watchmen_ai.llm.llm_builder import get_gpt_4
from watchmen_ai.task.base_action import BaseAction
from watchmen_model.system.ai_model import AIModel


class AIEngine:



    def run_action(self, action: BaseAction, ai_model: BaseLanguageModel, data):
        """

        :param action:
        :param ai_model:
        :param data:
        :return:
        """

        return action.run(data, ai_model)

