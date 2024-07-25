from typing import List

from watchmen_ai.lang.lang_service import get_message_by_lang
from watchmen_ai.model.copilot_intent import CopilotTask, CopilotIntent
from watchmen_ai.model.index import ObjectiveIntent


class CopilotTaskConfiguration:


    def load_intent_configuration(self,language:str)->CopilotIntent:
        acitons = get_message_by_lang(language,"action_list")

        intent = CopilotIntent(intent=ObjectiveIntent.recommend,intentDescription=acitons,tasks=[])
        intent.tasks = self.load_tasks_configuration_for_derived_objective(language)
        return intent

    def load_tasks_configuration_for_derived_objective(self,language:str)->List[CopilotTask]:
        tasks: List[CopilotTask] = [CopilotTask(task_name="summarize",
                                                description=get_message_by_lang(language,"Summarize"), depends=["time_range","business_target"]),
                                    CopilotTask(task_name="query_metrics",
                                                description=get_message_by_lang(language,"query_metrics"), depends=["time_range","business_target"]),
                                    CopilotTask(task_name="exception_metrics",
                                                description=get_message_by_lang(language,"exception_metrics"), depends=["time_range","rate"])
                                    ]

        return tasks
