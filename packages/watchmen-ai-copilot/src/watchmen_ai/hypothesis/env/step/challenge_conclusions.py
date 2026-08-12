
from logging import getLogger
from typing import List, Dict

from watchmen_ai.dspy.module.challenge_conclusion import ConclusionChallengeModule

from watchmen_ai.hypothesis.env.step.step_interface import SimulationStepInterface
from watchmen_ai.hypothesis.model.analysis import BusinessChallengeWithHypotheses, AnalysisData, HypothesisWithMetrics

from watchmen_ai.hypothesis.model.common import ChallengeAgentContext, ChallengeAnalysisResult
from watchmen_ai.markdown.document import MarkdownDocument

logger = getLogger(__name__)


def generate_hypotheses_markdown(hypothesis_result_dict: Dict, hypotheses: List[HypothesisWithMetrics]) -> str:
    """
    Generate a markdown document summarizing the analysis results of hypotheses.
    :param hypothesis_result_dict:
    :param hypotheses:
    :return:
    """

    markdown_document = MarkdownDocument()
    markdown_document.append_heading("Hypothesis Analysis Results")

    rows = []
    for hypothesis in hypotheses:
        if hypothesis.id in hypothesis_result_dict:
            analysis_data: AnalysisData = hypothesis_result_dict[hypothesis.id]
            for data_explain in analysis_data.data_explain_dict:
                row = [
                    hypothesis.title,
                    data_explain.hypothesisValidation,
                    data_explain.hypothesisValidationFlag,
                    data_explain.keyMetricChange
                ]
                rows.append(row)
        else:
            logger.error(f"Hypothesis ID {hypothesis.id} not found in result data.")

    markdown_document.append_table(
        headers=["Hypothesis Name", "Hypothesis Validation", "Validation Flag", "Key Metric Change"], rows=rows)

    return markdown_document.contents()


class ChallengeConclusionStep(SimulationStepInterface):

    def execute(self, challenge: BusinessChallengeWithHypotheses, context: ChallengeAgentContext, *args, **kwargs):
        conclusion_challenge = ConclusionChallengeModule()
        challenge_result =context.challenge_result

        hypothesis_result_dict = context.result_data

        # generate one merged hypotheses results markdown from all hypotheses' explains
        hypotheses_markdown = generate_hypotheses_markdown(hypothesis_result_dict, challenge.hypotheses)
        challenge_result.hypothesisAnalysisMarkdown = hypotheses_markdown

        challenge_insight_result = conclusion_challenge(challenge=challenge.title,
                                                question_result_markdown=hypotheses_markdown)

        challenge_result.challengeInsightResult = challenge_insight_result.response


        # print(challenge_result.challengeInsightResult)

        context.challenge_result = challenge_result
        return challenge

    def reset(self):
        pass
