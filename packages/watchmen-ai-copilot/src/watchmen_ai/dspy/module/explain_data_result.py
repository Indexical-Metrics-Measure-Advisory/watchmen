import dspy
from pydantic import BaseModel

from watchmen_ai.dspy.model.data_result import HypothesisDataResult
from watchmen_ai.dspy.model.data_story import Hypothesis


class DataExplain(BaseModel):
    hypothesisValidation :str = None
    keyMetricChange :str = None
    summaryFinding:str = None

class DataResultSign(dspy.Signature):
    """explain data results base on  hypothetical questions, data, and analytical methods
    """

    # storyName = dspy.InputField(desc="data story name")
    # subQuestion = dspy.InputField(desc="sub question")
    hypothesis = dspy.InputField(desc="hypothesis")
    analysisMethod = dspy.InputField(desc="analysis method")
    hypothesisEvidence = dspy.InputField(desc="hypothesis evidence")
    hypothesisResult = dspy.InputField(desc="hypothesis result")
    dataResult: HypothesisDataResult = dspy.InputField(desc="hypothesis data result")
    dataExplain:DataExplain = dspy.OutputField(desc="data explain")


class ExplainDataResultModule(dspy.Module):

    def __init__(self):
        self.model = dspy.ChainOfThought(DataResultSign)

    def forward(self, hypothesis:Hypothesis, data):
        return self.model( hypothesis=hypothesis.hypothesis,analysisMethod= hypothesis.analysisMethod,hypothesisEvidence = hypothesis.evidence,hypothesisResult= hypothesis.result, dataResult=data)


