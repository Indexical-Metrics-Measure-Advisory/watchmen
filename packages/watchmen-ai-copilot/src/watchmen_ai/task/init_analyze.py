from typing import List

from pydantic import BaseModel

from watchmen_ai.task.base_action import BaseAction
from watchmen_model.admin import Topic
from watchmen_model.console import Subject


class SuggestionAnalysisCase(BaseModel):
    analysis_target: str = None
    analysis_dimension: List[str] = []
    analysis_method: str = None
    analysis_metrics: List[str] = []


def init_analyze(topics: List[Topic], subjects: List[Subject]) -> List[SuggestionAnalysisCase]:
    ### read data

    pass


class InitAnalyzeAction(BaseAction):

    def run(self, context, ai_model):
        ## find subject and topic
        ##

        pass
