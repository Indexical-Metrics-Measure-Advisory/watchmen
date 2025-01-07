from typing import List, Optional

import dspy
from pydantic import BaseModel


class ConstructedMetric(BaseModel):
    name: str = None
    dataset_fields: List[str] = None
    description: str = None
    operator: str = None


class MetricResult(BaseModel):
    metric_field: Optional[str] = None
    reason: str = None
    constructed_metric: Optional[ConstructedMetric] = None


class DimensionResult(BaseModel):
    name: str = None
    reason: str = None
    dataset_field: str = None


class TimeResult(BaseModel):
    name: str = None
    reason: str = None
    dataset_field: str = None


class MetricsFinderResult(BaseModel):
    metric: MetricResult = None
    dimension: List[DimensionResult] = None
    time_dimension: List[TimeResult] = None


class MetricsFinderSignature(dspy.Signature):
    """your task is
    - First, review the metrics list and determine if any listed metric matches or aligns with the statistical test described in the `evidence` use metrics_field .
    - If no match is found in the metrics list,  to construct a suitable metric from the available dataset fields to address the statistical test described in the `evidence`.
    - Clearly explain the process of metric matching or construction, including why a specific field or combination of fields was chosen.
    """
    evidence = dspy.InputField(desc="evidence for the metrics")
    hypothesis = dspy.InputField(desc="hypothesis for the metrics")
    metrics = dspy.InputField(desc="A metric from the `metrics list` that aligns with the `evidence`")
    dataset = dspy.InputField(desc="dataset for the system")
    response: List[MetricsFinderResult] = dspy.OutputField(
        desc="include all  the metrics and dimensions and time dimensions")


class MetricsFinderModule(dspy.Module):

    def __init__(self):
        self.model = dspy.ChainOfThought(MetricsFinderSignature)

    def forward(self, evidence, hypothesis, dataset, metrics):
        return self.model(evidence=evidence, hypothesis=hypothesis, dataset=dataset, metrics=metrics)
