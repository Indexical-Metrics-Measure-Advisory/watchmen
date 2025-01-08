from typing import Optional, List

import dspy
from icecream import ic
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from watchmen_ai.dspy.model.data_result import HypothesisDataResult
from watchmen_ai.dspy.model.data_story import Hypothesis, DataStory, SubQuestion
from watchmen_ai.dspy.module.explain_data_result import ExplainDataResultModule
from watchmen_ai.dspy.module.insight_question_result import InsightQuestionResult
from watchmen_auth import PrincipalService
from watchmen_rest import get_any_principal
from watchmen_utilities import ExtendedBaseModel

router = APIRouter()



class AskDataResultExplain(BaseModel):
    storyName :Optional[str] = None
    subQuestion:Optional[str] = None
    hypothesis: Hypothesis = None
    dataResult:HypothesisDataResult = None


class AskDataInsight(BaseModel):
    context:str = None
    question :SubQuestion = None

@router.post("/ask_data_explain", tags=["data_insight"])
def ask_data_result_explain(ask_request:AskDataResultExplain,principal_service: PrincipalService = Depends(get_any_principal)):
    explain_data = ExplainDataResultModule()
    explain_result = explain_data(ask_request.hypothesis, ask_request.dataResult)
    ic(explain_result)
    return explain_result

@router.post("/ask_data_insight", tags=["data_insight"])
def ask_data_insight_for_question(ask_data_insight:AskDataInsight,principal_service: PrincipalService = Depends(get_any_principal)):
    insight_data = InsightQuestionResult()
    insight_result = insight_data(ask_data_insight.question, ask_data_insight.context)
    ic(insight_result)
    dspy.inspect_history(n=1)
    return insight_result




