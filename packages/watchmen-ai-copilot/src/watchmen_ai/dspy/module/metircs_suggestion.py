from typing import List

import dspy
from pydantic import Field, BaseModel

from watchmen_ai.hypothesis.model.data_story import HypothesisForDspy


class MetricSuggestionResult(BaseModel):

    metric_name: str = Field(description="metric name suggestion")
    description: str = Field(description="metric description suggestion")
    reason: str = Field(description="reason for the suggestion")


class MetricSuggestionSignature(dspy.Signature):
    """
    As a seasoned data analyst and expert in the insurance domain, your primary role is to propose relevant metrics for a given business hypothesis.

    **Instructions:**
    1.  **Analyze the Inputs:** Carefully review the `context`, `hypothesis`, and `dataset` columns provided.
    2.  **Brainstorm Metrics:** Based on the analysis, suggest a list of metrics that can be used to validate or explore the hypothesis.
    3.  **Define Metric Attributes:** For each suggested metric, provide:
        - `metric_name`: A clear, concise, and descriptive name for the metric.
        - `description`: A simple, easy-to-understand explanation of what the metric measures.
        - `reason`: A justification for why this metric is relevant to the hypothesis and the dataset.
    4.  **Ensure Alignment:** The suggested metrics must be directly aligned with the given hypothesis and derivable from the provided dataset columns.
    5.  **Prioritize and Limit:** Select ONLY the top 5 most important and relevant metrics. If fewer than 5 metrics are applicable, return all of them. NEVER return more than 5 metrics.
    6.  **Format the Output:** Your final output must be a list of `MetricSuggestionResult` objects, ordered by importance (most important first).
    
    **CRITICAL REQUIREMENT:** You MUST return a maximum of 5 metrics, ranked by their importance and relevance to the hypothesis.
    """
    context: str = dspy.InputField(description="The business context for the metric suggestion.")
    hypothesis: HypothesisForDspy = dspy.InputField(description="The hypothesis to be tested or explored.")
    dataset = dspy.InputField(description="A list of column names from the dataset available for metric creation.")
    response: List[MetricSuggestionResult] = dspy.OutputField(desc="A list of the top 5 most important suggested metrics with their names, descriptions, and reasons, ordered by importance. Maximum 5 metrics allowed.")

class MetricMatchResult(BaseModel):
    metric_name: str = Field(description="metric name")
    # match_exist_metric: str = Field(description="match exist metric name, if match multiple,pls return empty")
    match_score: float = Field(description="match score ,if match multiple, pls return 0")
    # formula: str = Field(description="formula for the metric if have it ")


class MetricMatchSignature(dspy.Signature):
    """
    As a metric matching specialist, your task is to identify relevant metrics from a pre-existing list that align with a given hypothesis and context.

    **Instructions:**
    1.  **Understand the Goal:** Review the `hypothesis` and `context` to fully grasp the analytical objective.
    2.  **Scan Existing Metrics:** Examine the `all_metrics` markdown table, which contains a list of available metrics.
    3.  **Identify and Score Matches:** For each metric in the `all_metrics` list, determine its relevance to the `hypothesis`. Assign a `match_score` between 0.0 and 1.0, where:
        - `1.0` indicates a perfect match.
        - `0.5` indicates a moderate relevance.
        - `0.0` indicates no relevance.
    4.  **Prioritize and Limit Results:** From all evaluated metrics, select ONLY the top 5 most relevant metrics based on their match scores. If there are fewer than 5 relevant metrics, return all of them. NEVER return more than 5 metrics.
    5.  **Return Results:** Your output should be a list of `MetricMatchResult` objects, containing the `metric_name` and its calculated `match_score`, sorted by match_score in descending order (highest score first).
    
    **CRITICAL REQUIREMENT:** You MUST return a maximum of 5 metrics, ranked by their relevance scores from highest to lowest.
    """

    context = dspy.InputField(description="The business context for the metric matching.")
    hypothesis: HypothesisForDspy = dspy.InputField(description="The hypothesis to find matching metrics for.")
    all_metrics: str = dspy.InputField(description="A markdown table of existing metrics with their names and descriptions.")
    response: List[MetricMatchResult] = dspy.OutputField(
        desc="A list of the top 5 most relevant metrics with their corresponding relevance scores, sorted by match_score in descending order. Maximum 5 metrics allowed."
    )

def filter_score_with_setting(match_result:List[MetricMatchResult]):
    setting_score = 0.8
    for item in match_result:
        if item.match_score < setting_score:
            item.match_exist_metric = ""
    return match_result

class MetricSuggestion(dspy.Module):

    def __init__(self):

        self.match_model = dspy.ChainOfThought(MetricMatchSignature)


    def forward(self,context, all_metrics,hypothesis):
        # res =  self.suggest_model(hypothesis=hypothesis, context=context, dataset=dataset)
        result = self.match_model(context=context, all_metrics=all_metrics,hypothesis=hypothesis)
        return result.response