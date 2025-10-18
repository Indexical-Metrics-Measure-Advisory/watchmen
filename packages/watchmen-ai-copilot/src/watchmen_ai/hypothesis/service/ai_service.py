from typing import List

import dspy

from watchmen_ai.dspy.module.generate_hypothesis_with_current_hypothesis import \
    GenerateHypothesisWithCurrentHypothesisModule
from watchmen_ai.dspy.module.generate_problem_with_current_problems import GenerateProblemWithCurrentProblemsModule
from watchmen_ai.hypothesis.model.business import BusinessProblem, BusinessChallenge
from watchmen_ai.hypothesis.model.hypothesis import Hypothesis


def generate_markdown_table_for_problem(problem_list:List[BusinessProblem]):

    """

    :param problem_list:
    :return:
    """

    markdown = "| Problem | Description | \n"
    markdown += "|------------|-------------|\n"
    for problem in problem_list:

        markdown += f"| {problem.title} | {problem.description} | \n"
    return markdown




def generate_markdown_table_for_hypothesis(hypothesis_list):
    """

    :param hypothesis_list:
    :return:
    """

    markdown = "| Hypothesis | Description | \n"
    markdown += "|------------|-------------|\n"
    if not hypothesis_list:
        return markdown

    for hypothesis in hypothesis_list:

        markdown += f"| {hypothesis.title} | {hypothesis.description} | \n"
    return markdown



async def generate_hypothesis_by_ai(challenge:BusinessChallenge,business_problem:BusinessProblem,hypothesis_list:List[Hypothesis]):
    generate_hypothesis = GenerateHypothesisWithCurrentHypothesisModule()

    current_hypothesis_markdown_table =  generate_markdown_table_for_hypothesis(hypothesis_list)

    # Generate new hypothesis using AI

    result = generate_hypothesis(
        challenge=challenge.title,
        question_description=business_problem.title,
        current_hypothesis_markdown_table=current_hypothesis_markdown_table
    )

    dspy.inspect_history(n=1)
    return result


async def generate_problem_by_ai(challenge:BusinessChallenge,business_problem_list:List[BusinessProblem]):
    """
    Generate new business problem using AI
    :param challenge:
    :param business_problem_list:
    :return:
    """
    generate_problem = GenerateProblemWithCurrentProblemsModule()

    markdown = generate_markdown_table_for_problem(business_problem_list)

    # Generate new hypothesis using AI

    result = generate_problem(challenge=challenge.title,challenge_description=challenge.description,current_problem_list = markdown)

    dspy.inspect_history(n=1)
    return result







