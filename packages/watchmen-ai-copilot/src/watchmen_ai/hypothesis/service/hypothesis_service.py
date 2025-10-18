from watchmen_ai.dspy.module.suggest_metric_analysis_method import SuggestMetricAnalysisMethodModule
from watchmen_ai.hypothesis.model.analysis import HypothesisWithMetrics


async def suggest_analysis_method(hypothesis: HypothesisWithMetrics,context:str) -> HypothesisWithMetrics:

    # call dspy

    suggest_analysis_method = SuggestMetricAnalysisMethodModule()


    for metric_detail in hypothesis.metrics_details:
        # call dspy
        result = suggest_analysis_method.forward(hypothesis.title,hypothesis.description,context,metric_detail.metric.name)

        metric_detail.metric.emulativeAnalysisMethod = result.response


    return hypothesis









