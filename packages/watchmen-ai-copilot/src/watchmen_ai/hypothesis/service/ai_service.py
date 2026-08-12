from typing import List

import dspy

from watchmen_ai.dspy.module.generate_hypothesis_with_current_hypothesis import \
    GenerateHypothesisWithCurrentHypothesisModule
from watchmen_ai.dspy.module.draft_hypothesis_from_context import DraftHypothesisFromContextModule
from watchmen_ai.hypothesis.model.business import BusinessChallenge
from watchmen_ai.hypothesis.model.hypothesis import Hypothesis, HypothesisContext


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



async def generate_hypothesis_by_ai(challenge:BusinessChallenge,hypothesis_list:List[Hypothesis]):
    generate_hypothesis = GenerateHypothesisWithCurrentHypothesisModule()

    current_hypothesis_markdown_table =  generate_markdown_table_for_hypothesis(hypothesis_list)

    # Generate new hypothesis using AI

    result = generate_hypothesis(
        challenge=challenge.title,
        question_description=challenge.description or challenge.title,
        current_hypothesis_markdown_table=current_hypothesis_markdown_table
    )

    dspy.inspect_history(n=1)
    return result


async def draft_hypothesis_by_ai(context: HypothesisContext):
    """
    Draft a hypothesis (title, description, analysis method) from a chart/alert/chat context using AI
    :param context:
    :return:
    """
    draft_hypothesis = DraftHypothesisFromContextModule()

    dimensions = ', '.join(context.dimensions) if context.dimensions else ''
    if context.filters:
        filters = ', '.join([f'{key}={value}' for key, value in context.filters.items()])
    else:
        filters = ''

    result = draft_hypothesis(
        metrics=', '.join(context.metrics or []),
        dimensions=dimensions,
        time_range=context.timeRange or '',
        filters=filters
    )

    dspy.inspect_history(n=1)
    return result







