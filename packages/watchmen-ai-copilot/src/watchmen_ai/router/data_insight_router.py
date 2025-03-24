from typing import Optional

from fastapi import APIRouter, Depends
from icecream import ic
from pydantic import BaseModel

from watchmen_ai.dspy.model.data_story import Hypothesis, SubQuestion
from watchmen_ai.dspy.module.explain_data_result import ExplainDataResultModule
from watchmen_ai.dspy.module.insight_question_result import InsightQuestionResult
from watchmen_auth import PrincipalService
from watchmen_rest import get_any_principal

router = APIRouter()



class AskDataResultExplain(BaseModel):
    storyName: Optional[str] = None
    subQuestion: Optional[str] = None
    hypothesis: Hypothesis = None


class AskDataInsight(BaseModel):
    context: Optional[str] = None
    question: SubQuestion = None


@router.post("/ask_data_explain", tags=["data_insight"])
def ask_data_result_explain(ask_request: AskDataResultExplain,
                            principal_service: PrincipalService = Depends(get_any_principal)):
    explain_data = ExplainDataResultModule()
    explain_result = explain_data(ask_request.hypothesis)
    # ic(explain_result)
    return explain_result


@router.post("/ask_data_insight", tags=["data_insight"])
def ask_data_insight_for_question(ask_data_insight: AskDataInsight,
                                  principal_service: PrincipalService = Depends(get_any_principal)):
    insight_data = InsightQuestionResult()
    insight_result = insight_data(ask_data_insight.question, ask_data_insight.context)
    # ic(insight_result)
    # dspy.inspect_history(n=1)
    return insight_result
