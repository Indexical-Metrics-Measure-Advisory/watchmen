from typing import List

import dspy
from pydantic import Field

from watchmen_ai.dspy.model.data_story import Hypothesis


class MetricSuggestionResult(dspy.BaseModel):

    metric_name: str = Field(description="metric name suggestion")
    description: str = Field(description="metric description suggestion")


class MetricSuggestionSignature(dspy.Signature):
    """your task is to generate suggestion  the metric name and description based on the given context and metric name"""
    context:str = dspy.InputField()
    hypothesis: Hypothesis = dspy.InputField()
    response:List[MetricSuggestionResult] = dspy.OutputField(desc="this response will contain the metric suggestion")

class MetricMatchResult(dspy.BaseModel):
    metric_name: str = Field(description="metric name")
    match_exist_metric: str = Field(description="match exist metric name")
    match_subject: str = Field(description="match subject column name")
    match_score: float = Field(description="match score")


class MetricMatchSignature(dspy.Signature):
    """your task is to mapping input metric to the existing metric and subject """

    context = dspy.InputField()
    inputMetrics:List[MetricSuggestionResult] = dspy.InputField()
    exsitedMetrics:List[MetricSuggestionResult] = dspy.InputField()
    exsitedSubject:List[str] = dspy.InputField()
    response: MetricMatchResult = dspy.OutputField(
        desc="The response of the NER model which contain insurance entities")

class MetricSuggestion(dspy.Module):

    def __init__(self):
        self.suggest_model = dspy.ChainOfThought(MetricSuggestionSignature)
        self.match_model = dspy.ChainOfThought(MetricMatchSignature)


    def forward(self, content, context):
        res =  self.suggest_model(input=content, context=context)
        return self.match_model(inputMetrics=res.response, context=context)