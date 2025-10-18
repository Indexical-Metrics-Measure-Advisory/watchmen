import dspy

from watchmen_ai.hypothesis.model.data_story import HypothesisForDspy

analysis_method = """
Trend Analysis,Distribution Analysis,Comparison Analysis,Correlation Analysis,Composition Analysis,features Importances,t-test,ANOVA,
"""


class HypothesisWithCurrentHypothesisSignature(dspy.Signature):
    """
    You are a seasoned insurance strategist and data scientist. Your mission is to formulate a **single, insightful, and non-obvious hypothesis** to investigate a critical insurance business challenge. The hypothesis must be deeply rooted in the provided business question and leverage the specified data analysis methods, while being distinct from existing hypotheses.

    **Core Objective:** Move beyond common-sense assumptions and generate a hypothesis that uncovers subtle, yet impactful, business dynamics.

    **Guidelines for Generating a Professional Hypothesis:**
    1.  **Insight-Driven, Not Obvious:** The hypothesis should not be a simple restatement of a known fact or a common-sense belief. It should propose a relationship or pattern that requires data to validate and has the potential to reveal something new. For example, instead of "Higher-risk clients have more claims," consider "Clients who have recently updated their contact information show a short-term spike in minor claims, possibly indicating life changes that affect risk."
    2.  **Specificity and Testability:** The hypothesis must be specific enough to be testable with the given `analysis_method` and `metrics_markdown_table`. It should clearly define the variables and the expected relationship.
    3.  **Business Impact:** A strong hypothesis, if proven true, should lead to actionable business decisions—such as refining underwriting processes, improving customer segmentation, or optimizing pricing strategies.
    4.  **Originality:** Ensure the new hypothesis offers a genuinely new perspective compared to the `current_hypothesis_list`. Do not submit variations of existing ideas.

    Your goal is to deliver a sophisticated and valuable hypothesis that can drive strategic decisions in the insurance domain.
    """

    challenge = dspy.InputField(description="The business challenge in the insurance domain that needs to be addressed")
    question_description = dspy.InputField(description="The main business question guiding this insurance analysis")
    metrics_markdown_table: str = dspy.InputField(description = "A markdown table of available metrics for analysis")
    analysis_method: str = dspy.InputField(description="The specific analysis method (e.g., correlation, clustering, trend analysis, etc.)")
    current_hypothesis_list: str = dspy.InputField(description="A markdown table of existing hypotheses to avoid duplication")
    response: HypothesisForDspy = dspy.OutputField(
        description="A single new hypothesis, clearly stated and distinct from existing ones"
    )

class GenerateHypothesisWithCurrentHypothesisModule(dspy.Module):

    def __init__(self):
        self.model = dspy.ChainOfThought(HypothesisWithCurrentHypothesisSignature)

    def forward(self, challenge, question_description,metrics_markdown_table, current_hypothesis_markdown_table):
        return self.model(challenge=challenge, question_description=question_description,metrics_markdown_table= metrics_markdown_table, current_hypothesis_list=current_hypothesis_markdown_table,analysis_method= analysis_method)
