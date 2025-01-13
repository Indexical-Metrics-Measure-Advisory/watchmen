from typing import List

import dspy

from watchmen_ai.dspy.model.data_story import HypothesisForDspy

analysis_method = """
Trend Analysis,Distribution Analysis,Comparison Analysis,Correlation Analysis,Composition Analysis,features Importances,t-test,ANOVA,
"""


class HypothesisSignature(dspy.Signature):
    """generate hypothesis (pls ref analysis_method for generate evidence and result) for business question base on context ,dataset and sub question
    hypothesis should be simple and easy to understand, and the number of hypothesis number should be 1 to 5, and the hypothesis should be generated base on dataset
    hypothesis should be easy design for data analysis and data visualization
    """

    sub_question = dspy.InputField(desc="sub business question for insurance business  analysis")
    context = dspy.InputField(desc="main business question for this insurance analysis story")
    dataset = dspy.InputField(desc="column name of dataset which will be used to generate hypothesis")
    analysis_method = dspy.InputField(desc="analysis method for this insurance analysis")
    response: List[HypothesisForDspy] = dspy.OutputField(
        desc="this response will contain the hypothesis, and the number of  hypothesis number should be 1 to 5")


class GenerateHypothesisModule(dspy.Module):

    def __init__(self):
        self.model = dspy.ChainOfThought(HypothesisSignature)

    def forward(self, question, context, dataset):
        return self.model(sub_question=question, dataset=dataset, context=context, analysis_method=analysis_method)
