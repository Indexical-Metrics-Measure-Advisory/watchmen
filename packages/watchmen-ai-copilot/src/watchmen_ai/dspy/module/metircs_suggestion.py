from typing import List

import dspy
from icecream import ic
from pydantic import Field

from watchmen_ai.dspy.model.data_story import Hypothesis, HypothesisForDspy, MarkdownSubject


class MetricSuggestionResult(dspy.BaseModel):

    metric_name: str = Field(description="metric name suggestion")
    description: str = Field(description="metric description suggestion")
    reason: str = Field(description="reason for the suggestion")
    formula: str = Field(description="formula for the metric if have it ")


class MetricSuggestionSignature(dspy.Signature):
    """You are an expert in the insurance domain and data analysis. Your task is to suggest appropriate metric names and descriptions based on the provided context, hypothesis, and dataset.
        - Ensure that the metric names are clear, concise, and directly aligned with the given hypothesis and dataset.
        - The metric descriptions should be simple, easy to understand, and provide a clear explanation of what the metric measures and how it supports the analysis.

    """
    context:str = dspy.InputField(description="context for the metric suggestion")
    hypothesis: HypothesisForDspy = dspy.InputField(description="hypothesis info")
    dataset = dspy.InputField(description="column name of dataset which will be used to metrics suggestion")
    response:List[MetricSuggestionResult] = dspy.OutputField(desc="this response will contain the metric suggestion")

class MetricMatchResult(dspy.BaseModel):
    metric_name: str = Field(description="metric name")
    match_exist_metric: str = Field(description="match exist metric name, if match multiple,pls return empty")
    match_score: float = Field(description="match score ,if match multiple, pls return 0")
    formula: str = Field(description="formula for the metric if have it ")


class MetricMatchSignature(dspy.Signature):
    """Your task is to find metrics base on hypothesis in existing metrics, and score the match results
      - Ensure that the match scores reflect the relevance and alignment between the input metrics and the existing metrics.
      - Return a list of the match results, including the match score for each metric, and provide a brief explanation of the rationale behind the match.
    """

    context = dspy.InputField(description="context for the metric suggestion")
    # suggested_metrics:List[MetricSuggestionResult] = dspy.InputField(description="suggested metrics")
    hypothesis: HypothesisForDspy = dspy.InputField(description="hypothesis info")
    exsitedMetrics:str = dspy.InputField(description="markdown table for the exsited metrics")
    # exsitedSubject:List[MarkdownSubject] = dspy.InputField(description="markdown table for the exsited subject")
    response: List[MetricMatchResult] = dspy.OutputField(
        desc="this response will contain the metric match result")

def filter_score_with_setting(match_result:List[MetricMatchResult]):
    setting_score = 0.8
    for item in match_result:
        if item.match_score < setting_score:
            item.match_exist_metric = ""
    return match_result

class MetricSuggestion(dspy.Module):

    def __init__(self):
        self.suggest_model = dspy.ChainOfThought(MetricSuggestionSignature)
        self.match_model = dspy.ChainOfThought(MetricMatchSignature)


    def forward(self, dataset,hypothesis, context, exsitedMetrics):
        # res =  self.suggest_model(hypothesis=hypothesis, context=context, dataset=dataset)
        result = self.match_model(context=context, exsitedMetrics=exsitedMetrics,hypothesis=hypothesis)
        return filter_score_with_setting(result.response)