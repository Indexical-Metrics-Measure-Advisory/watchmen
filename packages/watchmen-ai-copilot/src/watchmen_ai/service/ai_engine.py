from langchain_core.language_models import BaseLanguageModel

from watchmen_ai.task.base_action import BaseAction


class AIEngine:

    def run_action(self, action: BaseAction, ai_model: BaseLanguageModel, data):
        """

        :param action:
        :param ai_model:
        :param data:
        :return:
        """

        return action.run(data, ai_model)
