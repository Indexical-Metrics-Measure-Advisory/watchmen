from typing import List

import dspy

from watchmen_ai.dspy.model.data_story import SubQuestionForDspy


class SubQuestionSignature(dspy.Signature):
    """You are an expert in the insurance domain and data analysis. Please help generate a key question along with 1 to 5 sub-questions that progress from simple and general to more detailed and in-depth, based on the provided context, dataset, and business question.
- Use emojis before each question to make them visually engaging and clear.
- Ensure the sub-questions are easy to understand, directly aligned with the dataset, and practical for data analysis.
- Design the sequence of sub-questions to guide the analysis step-by-step, starting with basic inquiries and moving toward deeper insights
    """

    business_question = dspy.InputField(description="business question for insurance analysis")
    context = dspy.InputField(description="description of the business question")
    dataset = dspy.InputField(description="column name of dataset which will be used to generate sub question")
    response: List[SubQuestionForDspy] = dspy.OutputField(
        description="this response will contain the sub question, and the number of  sub question number should be 1 to 8")


def generate_markdown_sub_questions(sub_questions:List):
    markdown = ""
    for sub_question in sub_questions:
        markdown += f"#### {sub_question.emoji} {sub_question.sub_question}\n"
    return markdown


class GenerateSubQuestionModule(dspy.Module):

    def __init__(self):
        self.model = dspy.ChainOfThought(SubQuestionSignature)

    def forward(self, question, context, dataset,sub_questions = None):
        if sub_questions:
            sub_questions_markdown = generate_markdown_sub_questions(sub_questions)
            context = f"{context}\n{sub_questions_markdown}"

        return self.model(business_question=question, context=context, dataset=dataset)





