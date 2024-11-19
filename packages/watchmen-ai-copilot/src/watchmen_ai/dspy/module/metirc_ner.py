from typing import List

import dspy
from pydantic import BaseModel


class MetricMatchResult(BaseModel):
    metric_name: str = None
    description: str = None
    match_score: float = None


class MetricNERResult(BaseModel):
    match_results: List[MetricMatchResult] = []


class MetricNER(dspy.Signature):
    """your task is to extract insurance entities from given input content"""

    context = dspy.InputField()
    input: str = dspy.InputField()
    response: MetricNERResult = dspy.OutputField(
        desc="The response of the NER model which contain insurance entities")


class MetricNERMatch(dspy.Module):
    def __init__(self):
        self.match = dspy.ChainOfThought(MetricNER)

    def forward(self, content, context):
        return self.match(input=content, context=context)
