from typing import List

import dspy

from watchmen_ai.hypothesis.model.data_story import HypothesisForDspy

analysis_method = """
Trend Analysis,Distribution Analysis,Comparison Analysis,Correlation Analysis,Composition Analysis,features Importances,t-test,ANOVA,
"""


class HypothesisSignature(dspy.Signature):
    """You are an expert in the insurance domain and data analysis. Your task is to generate simple and clear hypotheses to address a given business question based on the provided context, dataset, and sub-questions. Please refer to the specified analysis_method(only one)to ensure that the hypotheses are well-suited for generating evidence and results.
        1.Limit the number of hypotheses to 1 to 5, ensuring they are directly aligned with the dataset.
        2.Ensure each hypothesis is easy to understand, straightforward to analyze, and conducive to effective data visualization.
        3.Focus on designing hypotheses that can be practically tested using data analysis method.
    """

    sub_question = dspy.InputField(description="sub business question for insurance business  analysis")
    context = dspy.InputField(description="main business question for this insurance analysis story")
    dataset = dspy.InputField(description="column name of dataset which will be used to generate hypothesis")
    analysis_method:str = dspy.InputField(description="analysis method for this insurance analysis")
    response: List[HypothesisForDspy] = dspy.OutputField(
        description="this response will contain the hypothesis, and the number of  hypothesis number should be 1 to 5")


class GenerateHypothesisModule(dspy.Module):

    def __init__(self):
        self.model = dspy.ChainOfThought(HypothesisSignature)

    def forward(self, question, context, dataset):
        return self.model(sub_question=question, dataset=dataset, context=context, analysis_method=analysis_method)
