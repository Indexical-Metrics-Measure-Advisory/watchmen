from typing import List

import dspy

from watchmen_ai.dspy.model.data_result import HypothesisDataResult
from watchmen_ai.dspy.model.data_story import Hypothesis, DataExplain
from watchmen_ai.markdown.document import MarkdownDocument
from watchmen_ai.router.utils import convert_data_to_markdown




class DataResultSign(dspy.Signature):
    """explain data results base on  hypothetical questions, data, and analytical methods,
    pls use business language in insurance domain to explain the data results,make it simple and easy to understand
    """

    # storyName = dspy.InputField(desc="data story name")
    # subQuestion = dspy.InputField(desc="sub question")
    hypothesis = dspy.InputField(description="hypothesis")
    analysisMethod = dspy.InputField(description="analysis method")
    hypothesisEvidence = dspy.InputField(description="hypothesis evidence")
    hypothesisResult = dspy.InputField(description="hypothesis result")
    dataResult: HypothesisDataResult = dspy.InputField(description="hypothesis data result")
    dataExplain:DataExplain = dspy.OutputField(description="data explain")


def convert_hypothesis_to_markdown(data_result_list: List[HypothesisDataResult]):
    markdown_document = MarkdownDocument()
    data_markdown = convert_data_to_markdown(data_result_list,markdown_document)
    return markdown_document.contents()



class ExplainDataResultModule(dspy.Module):

    def __init__(self):
        self.model = dspy.ChainOfThought(DataResultSign)

    def forward(self, hypothesis:Hypothesis):
        data_markdown = convert_hypothesis_to_markdown(hypothesis.dataResult)
        return self.model( hypothesis=hypothesis.hypothesis,analysisMethod= hypothesis.analysisMethod,hypothesisEvidence = hypothesis.evidence,hypothesisResult= hypothesis.result, dataResult=data_markdown)


