from typing import Optional, List
from icecream import ic
from fastapi import APIRouter
from pydantic import BaseModel

from watchmen_ai.dspy.model.data_result import HypothesisDataResult
from watchmen_ai.dspy.model.data_story import Hypothesis, DataStory, SubQuestion
from watchmen_ai.dspy.module.explain_data_result import ExplainDataResultModule
from watchmen_utilities import ExtendedBaseModel

router = APIRouter()



class AskDataResultExplain(BaseModel):
    storyName :Optional[str] = None
    subQuestion:Optional[str] = None
    hypothesis: Hypothesis = None
    dataResult:HypothesisDataResult = None



@router.post("/ask_data_explain", tags=["data_insight"])
def ask_data_result_explain(ask_request:AskDataResultExplain):
    explain_data = ExplainDataResultModule()
    explain_result = explain_data(ask_request.hypothesis, ask_request.dataResult)
    ic(explain_result)
    return explain_result

def ask_data_insight_for_question(question:SubQuestion):


    pass



