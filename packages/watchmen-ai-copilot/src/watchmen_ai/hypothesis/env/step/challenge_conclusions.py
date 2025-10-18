
from logging import getLogger
from typing import List, Dict

from watchmen_ai.dspy.module.challenge_conclusion import ConclusionChallengeModule
from watchmen_ai.dspy.module.problem_conclusion import ConclusionQuestionModule, QuestionInsightResult

from watchmen_ai.hypothesis.env.step.step_interface import SimulationStepInterface
from watchmen_ai.hypothesis.model.analysis import BusinessChallengeWithProblems, AnalysisData, HypothesisWithMetrics

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


def generate_problem_answer_markdown(question_answer_list) -> str:
    markdown_document = MarkdownDocument()
    markdown_document.append_heading("Challenge Conclusions")
    markdown_document.append_table(
        headers=["Problem Title", "Answer for Question", "Summary for Hypothesis", "Future Analysis",
                 "Future Business Action"],
        rows=question_answer_list
    )
    return markdown_document.contents()


class ChallengeConclusionStep(SimulationStepInterface):

    def execute(self, challenge: BusinessChallengeWithProblems, context: ChallengeAgentContext, *args, **kwargs):
        conclusion_question = ConclusionQuestionModule()
        conclusion_challenge = ConclusionChallengeModule()
        challenge_result =context.challenge_result

        hypothesis_result_dict = context.result_data
        question_answer_list = []

        for problem in challenge.problems:
            # generate hypothesis markdown
            problem_hypothesis_markdown = generate_hypotheses_markdown(hypothesis_result_dict, problem.hypotheses)
            # challenge_result.hypothesisAnalysisResult = hypothesis_result_dict
            challenge_result.hypothesisAnalysisMarkdownDict[problem.id] = problem_hypothesis_markdown

            result = conclusion_question(challenge=challenge.title, question=problem.title,
                                         hypotheses_result_markdown=problem_hypothesis_markdown)
            problem_result: QuestionInsightResult = result.response
            challenge_result.questionResultDict[problem.id] = problem_result
            question_answer_list.append([
                problem.title,
                problem_result.answerForQuestion,
                problem_result.summaryForHypothesis,
                problem_result.futureAnalysis,
                problem_result.futureBusinessAction
            ])

        # generate markdown table for question answer
        markdown_document = generate_problem_answer_markdown(question_answer_list)

        challenge_result.questionAnswerMarkdown = markdown_document

        challenge_insight_result = conclusion_challenge(challenge=challenge.title,
                                                question_result_markdown=markdown_document)

        challenge_result.challengeInsightResult = challenge_insight_result.response


        # print(challenge_result.challengeInsightResult)

        context.challenge_result = challenge_result
        return challenge

    def reset(self):
        pass
