from typing import List

import dspy

from watchmen_ai.hypothesis.model.data_result import HypothesisDataResult
from watchmen_ai.hypothesis.model.data_story import DataExplain
from watchmen_ai.hypothesis.model.hypothesis import Hypothesis
from watchmen_ai.markdown.document import MarkdownDocument
from watchmen_ai.router.utils import convert_data_to_markdown


class DataResultSign(dspy.Signature):
    """As a senior insurance strategist and data scientist, your mission is to distill complex data into a clear, concise, and strategic narrative. You must transform raw data analysis into a compelling story that drives executive decision-making.

    **Core Objective:**
    Translate the provided data analysis (`dataResult`) for a given `hypothesis` into a powerful, data-driven explanation. Your output must be professional, succinct, and culminate in a clear, actionable roadmap.

    **Instructions for Crafting Your Data-Driven Narrative:**

    1.  **Synthesize Key Insights (The "What"):**
        - Go beyond simple observations. Identify the 1-3 most critical, non-obvious insights from the `dataResult`.
        - For each insight, you **must** cite the specific metrics or data points that serve as evidence. Example: "The 15% drop in claim approvals for X segment, as shown in the cohort analysis, indicates..."

    2.  **Explain Strategic Implications (The "So What"):**
        - Connect each insight directly to its business impact. Do not be generic.
        - Quantify the impact where possible (e.g., potential revenue gain, cost reduction, market share shift).
        - Frame the implications in strategic terms: competitive advantage, operational efficiency, or customer experience enhancement.

    3.  **Define an Actionable Roadmap (The "Now What"):**
        - Provide a clear, forward-looking set of next steps. This is critical.
        - Structure your recommendations into two parts:
            - **Immediate Actions (Next 30 Days):** What specific, tangible steps must be taken now?
            - **Strategic Initiatives (Next 1-3 Quarters):** What larger projects or strategic shifts should be initiated based on the findings?

    **Crucial Guidelines:**
    - **Be Decisive:** Present conclusions with confidence, backed by your data evidence.
    - **Eliminate Fluff:** Every sentence should serve a purpose. Avoid vague statements and business jargon.
    - **Executive Focus:** Structure your response for a senior leadership audience that values clarity, evidence, and action.
    """

    hypothesis = dspy.InputField(description="The business hypothesis that was tested.")
    analysisMethod = dspy.InputField(description="The analytical method used to test the hypothesis (e.g., regression analysis, cohort analysis).")
    hypothesisEvidence = dspy.InputField(description="A summary of the evidence supporting or refuting the hypothesis.")
    hypothesisResult = dspy.InputField(description="The final conclusion of the hypothesis test (e.g., 'Confirmed,' 'Rejected').")
    dataResult: HypothesisDataResult = dspy.InputField(description="The raw or summarized data results in Markdown format.")
    dataExplain: DataExplain = dspy.OutputField(description="A structured explanation of the data results, including key findings, business impact, and actionable recommendations.")


def convert_hypothesis_to_markdown(data_result_list: List[HypothesisDataResult]):
    markdown_document = MarkdownDocument()
    data_markdown = convert_data_to_markdown(data_result_list, markdown_document)
    return markdown_document.contents()


class ExplainDataResultModule(dspy.Module):

    def __init__(self):
        self.model = dspy.ChainOfThought(DataResultSign)

    def forward(self, hypothesis: Hypothesis):
        data_markdown = convert_hypothesis_to_markdown(hypothesis.dataResult)
        return self.model(hypothesis=hypothesis.hypothesis, analysisMethod=hypothesis.analysisMethod,
                          hypothesisEvidence=hypothesis.evidence, hypothesisResult=hypothesis.result,
                          dataResult=data_markdown)
