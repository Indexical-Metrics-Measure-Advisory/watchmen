from datetime import datetime
from typing import List

import pandas as pd

from watchmen_ai.hypothesis.model.data_story import HypothesisForDspy, MarkdownObjectiveTarget
from watchmen_ai.dspy.module.metircs_suggestion import MetricSuggestion, MetricMatchResult
from watchmen_ai.dspy.module.suggestion_dimensions import SuggestingDimensionsModule, SuggestedDimensionResult
from watchmen_ai.hypothesis.env.step.step_interface import SimulationStepInterface
from watchmen_ai.hypothesis.model.analysis import BusinessChallengeWithProblems, HypothesisWithMetrics
from watchmen_ai.hypothesis.model.common import ChallengeAgentContext
from watchmen_ai.hypothesis.model.metrics import MetricDetailType, MetricFlowMetric, MetricType, MetricDimension
from watchmen_ai.hypothesis.service.metric_service import load_dimensions_by_metrics
from watchmen_model.indicator import Objective


class MetricSimulationStep(SimulationStepInterface):
    """
    A class representing a step in a metric simulation process.
    This class is used to define the structure and behavior of a metric simulation step.
    """

    @staticmethod
    def find_suitable_metric(match_result, all_metrics):
        for metric in all_metrics:
            if metric.name == match_result.metric_name:
                return metric
        return None

    def convert_metric_details_to_markdown_table(self, metric_details: List[MetricFlowMetric]):
        """
        Convert a list of metric details to a markdown table format.
        This method takes a list of metric details and converts it to a markdown table format.
        """
        # metrics = []
        markdown_table = "| Metric Name | Description | category |\n| --- | --- | --- |\n"
        for metric_detail in metric_details:
            markdown_table += f"| {metric_detail.name} | {metric_detail.label} | {metric_detail.type} |\n"

        return markdown_table




    def find_metric_details(self, context, hypothesis:HypothesisWithMetrics, metric_suggestion, metrics_md_table):
        # if hypothesis.metrics_details:
        #     return hypothesis.metrics_details
        # else:
        hypothesis_dspy = HypothesisForDspy(
            hypothesis=hypothesis.title,
            description=hypothesis.description,
            analysisMethod=hypothesis.analysisMethod
        )

        # print(metrics_md_table)
        match_results: List[MetricMatchResult] = metric_suggestion(context.context, metrics_md_table,
                                                                   hypothesis_dspy)

        # print("match_results",match_results)
        ## filter is match_score <0.8
        match_results = [result for result in match_results if result.match_score >= 0.4]
        metric_metric_result = []
        ## find metric in details list
        for match_result in match_results:
            metric_detail = self.find_suitable_metric(match_result, context.all_metrics)
            # print("metric_detail", metric_detail)
            if metric_detail is not None:
                metric_metric_result.append(MetricDetailType(metric=MetricType(name=metric_detail.name,  createAt=datetime.now().replace(tzinfo=None, microsecond=0),
                        lastModifiedAt=datetime.now().replace(tzinfo=None, microsecond=0))))

        hypothesis.metrics_details = metric_metric_result
        dimensions:List[MetricDimension] = load_dimensions_by_metrics([metric.metric_name for metric in match_results])

        return hypothesis.metrics_details,dimensions

    def convert_objective_target_to_markdown_table_format(self, objective_list: List[Objective]):
        markdown_list = []
        for objective in objective_list:
            targets = objective.targets
            table_columns_data = []
            for target in targets:
                table_columns_data.append({"name": target.name, "asis": target.asis})

            df = pd.DataFrame(table_columns_data)
            markdown_table = df.to_markdown(index=False)
            markdown_list.append(MarkdownObjectiveTarget(objective_name=objective.name, markdown_table=markdown_table))
        return markdown_list

    def execute(self, challenge: BusinessChallengeWithProblems, context: ChallengeAgentContext, *args, **kwargs):
        metric_suggestion = MetricSuggestion()
        suggestion_dimensions  = SuggestingDimensionsModule()

        # objective_md_list = self.convert_objective_target_to_markdown_table_format(context.objectives)

        # all_metric_details = context.allMetrics
        metrics_md_table = self.convert_metric_details_to_markdown_table(context.all_metrics)

        # print(metrics_md_table)

        for problem in challenge.problems:
            # Simulate the metric for each problem
            # This is where you would implement the logic to simulate the metric
            # For now, we will just print the problem
            for hypothesis in problem.hypotheses:
                # print(f"Simulating metric for hypothesis: {hypothesis.title}")
                metrics_details,dimensions = self.find_metric_details(context, hypothesis, metric_suggestion, metrics_md_table)
                # for metric_detail in metrics_details:

                result = suggestion_dimensions(business_question = problem.description,hypothesis = hypothesis.description
                                      ,metrics=[metric_detail.metric.name for metric_detail in metrics_details],
                                      dimensions=[dimension.name for dimension in dimensions])
                # print("suggestion_dimensions result", result)
                suggestion_dimension_list:List[SuggestedDimensionResult] = result.response
                hypothesis.dimensions= self.find_result_in_dimension_list(dimensions, suggestion_dimension_list)

    def find_result_in_dimension_list(self, dimensions, suggestion_dimension_list):
        # filter the dimensions by suggestion
        result = []
        for suggestion in suggestion_dimension_list:
            for dimension in dimensions:
                if suggestion.dimension_name == dimension.name and suggestion.importance >= 0.8:
                    result.append(dimension)
        ## remove duplicate dimensions
        result = list({dimension.name: dimension for dimension in result}.values())
        return result


    def reset(self):
        pass
