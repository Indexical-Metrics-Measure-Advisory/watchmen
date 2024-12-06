from typing import List

import dspy

from watchmen_ai.dspy.model.data_story import SubQuestionForDspy



class SubQuestionSignature(dspy.Signature):
    """generate sub question and add emoji before question for business question base on context ,dataset and business question """

    business_question = dspy.InputField(desc="business question for insurance analysis")
    context = dspy.InputField(desc="description of the business question")

    dataset = dspy.InputField(desc="column name of dataset which will be used to generate sub question")
    response: List[SubQuestionForDspy] = dspy.OutputField(
        desc="this response will contain the sub question, and the number of  sub question should be 3-5")


class GenerateSubQuestionModule(dspy.Module):

    def __init__(self):
        self.model = dspy.ChainOfThought(SubQuestionSignature)

    def forward(self, question, context,dataset):
        # TODO cache the result
        return self.model(business_question=question, context=context, dataset=dataset)
