from typing import List

import dspy

from watchmen_ai.dspy.model.data_story import SubQuestionForDspy


class SubQuestionSignature(dspy.Signature):
    """generate a key question and sub questions and add emoji before question for business question base on context ,dataset and business question """

    business_question = dspy.InputField(desc="business question for insurance analysis")
    context = dspy.InputField(desc="description of the business question")

    dataset = dspy.InputField(desc="column name of dataset which will be used to generate sub question")
    response: List[SubQuestionForDspy] = dspy.OutputField(
        desc="this response will contain the sub question, and the number of  sub question number should be 1 to 8")


class GenerateSubQuestionModule(dspy.Module):

    def __init__(self):
        self.model = dspy.ChainOfThought(SubQuestionSignature)

    def forward(self, question, context, dataset):

        return self.model(business_question=question, context=context, dataset=dataset)
