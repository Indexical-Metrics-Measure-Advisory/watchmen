from typing import List, Literal, Union
from typing import Optional, Dict

from watchmen_ai.hypothesis.model.data_story import DataExplain
from watchmen_ai.hypothesis.model.business import BusinessProblem, BusinessChallenge
from watchmen_ai.hypothesis.model.hypothesis import Hypothesis
from watchmen_ai.hypothesis.model.metrics import MetricDetailType, MetricDimension
from watchmen_ai.hypothesis.service.metric_service import MetricFlowResponse
from watchmen_model.common import UserBasedTuple, OptimisticLock, Auditable
from watchmen_utilities import ExtendedBaseModel, ArrayHelper



class MetricComparison(ExtendedBaseModel):
    label: str
    value: float
    change: float
    changeType: Literal["increase", "baseline"]


class Metrics(ExtendedBaseModel):
    title: str
    comparisons: List[MetricComparison]


class KeyFindings(ExtendedBaseModel):
    summary: str
    metrics: Metrics


class RecommendedAction(ExtendedBaseModel):
    content: str


class ResearchSuggestion(ExtendedBaseModel):
    content: str


class InsightsData(ExtendedBaseModel):
    keyFindings: KeyFindings
    recommendedActions: List[RecommendedAction]
    researchSuggestions: List[ResearchSuggestion]


class CustomerCharacteristic(ExtendedBaseModel):
    label: str
    value: str
    percentage: float


class PurchaseBehavior(ExtendedBaseModel):
    icon: str
    title: str
    description: str


class ConversionData(ExtendedBaseModel):
    name: str
    value: float
    conversion: float


class MetricTrend(ExtendedBaseModel):
    month: str
    conversion_rate: float
    customer_acquisition_rate: float


class TestResult(ExtendedBaseModel):
    name: str
    conversion_a: float
    conversion_b: float
    sample_size: int
    p_value: float


class SignificanceData(ExtendedBaseModel):
    p_value: float
    label: str


class AnalysisMetrics(ExtendedBaseModel):
    sample_size: int
    duration: str


class LastAnalysis(ExtendedBaseModel):
    date: str
    days_ago: str


class MetricsCard(ExtendedBaseModel):
    significance: SignificanceData
    analysis_data: AnalysisMetrics
    last_analysis: LastAnalysis


class AnalysisDataset(ExtendedBaseModel):
    # analysis_type:str
    dataset: MetricFlowResponse
    # metrics: List[AnalysisMetrics]


def construct_analysis_dataset(value):
    if isinstance(value, AnalysisDataset):
        return value
    elif isinstance(value, dict):
        # noinspection PyArgumentList
        return AnalysisDataset(**value)
    else:
        return AnalysisDataset(**value)


def construct_metric_dimension(value):
    if isinstance(value, MetricDimension):
        return value
    elif isinstance(value, dict):
        # noinspection PyArgumentList
        return MetricDimension(**value)
    else:
        raise ValueError(f"Invalid type for MetricDimension: {type(value)}")


class AnalysisMetric(ExtendedBaseModel):
    name: Optional[str]
    category: Optional[str]
    dataset: Optional[AnalysisDataset] = None
    dimensions: Optional[List[MetricDimension]] = None

    def __setattr__(self, name, value):
        if name == 'dataset':
            super().__setattr__(name, construct_analysis_dataset(value))
        # elif name == 'dimension':
        #     if isinstance(value, list):
     #         return [construct_metric_dimension(v) for v in value]
        #     elif isinstance(value, dict):
        #         return [construct_metric_dimension(value)]
        #     else:
        #         raise ValueError(f"Invalid type for MetricDimension: {type(value)}")

        else:
            super().__setattr__(name, value)


def construct_analysis_metric(value):
    if isinstance(value, AnalysisMetric):
        return value
    elif isinstance(value, dict):
        # noinspection PyArgumentList
        return AnalysisMetric(**value)


def construct_data_explain(value: Union[DataExplain, Dict]) -> Optional[DataExplain]:
    if value is None:
        return None
    elif isinstance(value, DataExplain):
        return value
    else:
        return DataExplain(**value)


def construct_data_explain_list(value_list):
    if value_list:
        ArrayHelper(value_list).map(lambda x: construct_data_explain(x)).to_list()
    else:
        return None


class AnalysisData(ExtendedBaseModel, UserBasedTuple, OptimisticLock, Auditable):
    analysis_id: Optional[str] = None
    hypothesis_id: Optional[str] = None
    # hypotheses: Optional[List[Hypothesis]] = []
    analysis_metrics: Optional[List[AnalysisMetric]] = []
    data_explain_dict: Optional[List[DataExplain]] = []

    # def __setattr__(self, name, value):
    #     if name == 'analysis_metric':
    #         pass
    #         # if isinstance(value, list):
    #         #     return [construct_analysis_metric(v) for v in value]
    #         # elif isinstance(value, dict):
    #         #     return [construct_analysis_metric(value)]
    #         # else:
    #         #     raise ValueError(f"Invalid type for analysis_metric: {type(value)}")
    #     # elif name == 'data_explain_dict':
    #     #     super().__setattr__(name, construct_data_explain_list(value))
    #     # else:
    #     #     super().__setattr__(name, value)


def construct_metric_detail(value):
    if isinstance(value, MetricDetailType):
        return value
    elif isinstance(value, dict):
        # noinspection PyArgumentList
        return MetricDetailType(**value)
    else:
        return MetricDetailType(**value)


def construct_metrics_details(value_list):
    if value_list:
        if isinstance(value_list, list):
            return [construct_metric_detail(value) for value in value_list]
        elif isinstance(value_list, dict):
            return [construct_metric_detail(value_list)]
    else:
        return None


class HypothesisWithMetrics(Hypothesis, UserBasedTuple, OptimisticLock, Auditable):
    metrics_details: Optional[List[MetricDetailType]] = []
    dimensions: Optional[List[MetricDimension]] = []

    def __setattr__(self, name, value):
        if name == 'metrics_details':
            super().__setattr__(name, construct_metrics_details(value))
        else:
            super().__setattr__(name, value)


class BusinessProblemWithHypotheses(BusinessProblem):
    hypotheses: Optional[List[HypothesisWithMetrics]] = []


class BusinessChallengeWithProblems(BusinessChallenge):
    problems: Optional[List[BusinessProblemWithHypotheses]]= []


