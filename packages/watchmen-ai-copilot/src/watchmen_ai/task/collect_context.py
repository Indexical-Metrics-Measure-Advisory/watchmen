from langchain_core.language_models import BaseLanguageModel
from typing import Dict

from watchmen_ai.task.base_action import BaseAction, TaskContext


class CollectContextReq(TaskContext):
    pass


class CollectContextAction(BaseAction):
    def run(self, context: CollectContextReq, ai_model: BaseLanguageModel):



        pass
