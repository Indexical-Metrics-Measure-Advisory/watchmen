from typing import List

from watchmen_ai.model.copilot_intent import CopilotTask, CopilotIntent
from watchmen_ai.model.index import ObjectiveIntent


class CopilotTaskConfiguration:


    def load_intent_configuration(self)->CopilotIntent:
        intent = CopilotIntent(intent=ObjectiveIntent.recommend,intentDescription="Recommend Action: ")
        intent.tasks = self.load_tasks_configuration_for_derived_objective()
        return intent

    def load_tasks_configuration_for_derived_objective(self)->List[CopilotTask]:
        tasks: List[CopilotTask] = [CopilotTask(task_name="Summarize",
                                                description="Summarize Business Target", depends=["time_range","business_target"]),
                                    CopilotTask(task_name="query_metrics",
                                                description="Query metrics YoY/MoM", depends=["time_range","business_target"]),
                                    CopilotTask(task_name="exception_metrics",
                                                description="View data that deviates from the baseline", depends=["time_range","rate"])
                                    ]

        return tasks
