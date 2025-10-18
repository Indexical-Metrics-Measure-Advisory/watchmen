import uuid
from datetime import datetime
from typing import List

from watchmen_ai.hypothesis.model.data_story import HypothesisForDspy
from watchmen_ai.dspy.module.generate_hypothesis_with_current_hypothesis import \
    GenerateHypothesisWithCurrentHypothesisModule
from watchmen_ai.hypothesis.env.step.step_interface import SimulationStepInterface
from watchmen_ai.hypothesis.model.analysis import BusinessChallengeWithProblems, HypothesisWithMetrics
from watchmen_ai.hypothesis.model.metrics import MetricFlowMetric
from watchmen_ai.hypothesis.service.ai_service import generate_markdown_table_for_hypothesis


class HypothesisSimulationStep(SimulationStepInterface):
    """
    A class to simulate the hypothesis environment.
    This class is used to simulate the hypothesis environment for testing purposes.
    """

    def __init__(self,hypothesis_limit: int = 2):
        self.hypothesis_limit = hypothesis_limit

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

    def execute(self, challenge:BusinessChallengeWithProblems, context, *args, **kwargs):


        # loop problems
        for problem in challenge.problems:
            # Simulate the hypothesis for each problem
            # This is where you would implement the logic to simulate the hypothesis
            # For now, we will just print the problem
            # print(f"Simulating hypothesis for problem: {problem.title}")

            if problem.hypotheses and len(problem.hypotheses)>=self.hypothesis_limit:
               return challenge
            else:
                problem.hypotheses = problem.hypotheses or []
                number_of_hypothesis = len(problem.hypotheses) if problem.hypotheses else 0
                for _ in range(self.hypothesis_limit -number_of_hypothesis):
                    generate_hypothesis = GenerateHypothesisWithCurrentHypothesisModule()
                    metrics_md_table = self.convert_metric_details_to_markdown_table(context.all_metrics)
                    current_hypothesis_markdown_table = generate_markdown_table_for_hypothesis(problem.hypotheses)
                    # Generate new hypothesis using AI
                    result = generate_hypothesis(
                        challenge=challenge.title,
                        question_description=problem.description,
                        metrics_markdown_table=metrics_md_table,
                        current_hypothesis_markdown_table=current_hypothesis_markdown_table
                    )

                    hypothesis_dspy:HypothesisForDspy = result.response

                    hypothesis =  HypothesisWithMetrics(
                        id=str(uuid.uuid4()),
                        title=hypothesis_dspy.hypothesis,
                        description=hypothesis_dspy.description,
                        analysisMethod=hypothesis_dspy.analysisMethod,
                        createAt=datetime.now().replace(tzinfo=None, microsecond=0),
                        lastModifiedAt=datetime.now().replace(tzinfo=None, microsecond=0),
                        tenantId = challenge.tenantId,
                    )

                    problem.hypotheses.append(hypothesis)

        return challenge

    def reset(self):
        pass

