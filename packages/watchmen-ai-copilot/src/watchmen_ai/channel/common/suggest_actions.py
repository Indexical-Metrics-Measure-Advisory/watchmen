from typing import Dict

from pydantic import BaseModel

from watchmen_ai.knowledge_base.graphdb.graph_db_service import find_adapter, GraphDBProvider


class SuggestActionModel(BaseModel):
    name: str = None
    action: str = None
    tooltip: str = None


graph_service = find_adapter(GraphDBProvider.Kuzu)


class SuggestActionService:

    async def suggest_actions(self, user_profile: Dict, intent: str):
        suggest_action_list = []

        # generate suggested actions based on user profile and intent ,2 options for now

        # default actions for ice breaker

        return self.mock_actions()

    def mock_actions(self):
        return [SuggestActionModel(name="Start Analysis for Your Business Needs", action="analysis_objective",
                                   tooltip="Click to explore data insights based on your objectives"),
                SuggestActionModel(name="Build a Report That Fits Your Needs", action="customize_report",
                                   tooltip="Click to build a report tailored to your needs")]

    def mock_report_action(self):
        return [SuggestActionModel(name="Report For Sales Analysis", action="Option 1"),
                SuggestActionModel(name="Report for Renew Policy", action="Option 2"), ]

    def suggested_metric_actions(self, business_target: str):

        # TODO generate suggestion actions
        # TODO add default action

        return self.mock_metrics_actions()

    def mock_metrics_actions(self):
        return [SuggestActionModel(name="Analyze AFYP by Time Period", action="Option 1"),
                SuggestActionModel(name="Analyze AFYC by Time Period", action="Option 2"),
                SuggestActionModel(name="Compare Average Premium by Time Period", action="Option 3"),
                SuggestActionModel(name="View Number of Policies Sold", action="Option 4"),
                SuggestActionModel(name="Generate Summary Report", action="Option 5"),
                SuggestActionModel(name="Ask Question For Documents", action="Option 6"),
                SuggestActionModel(name="End Of Analysis", action="Option 7")
                ]


suggest_action_service = SuggestActionService()
