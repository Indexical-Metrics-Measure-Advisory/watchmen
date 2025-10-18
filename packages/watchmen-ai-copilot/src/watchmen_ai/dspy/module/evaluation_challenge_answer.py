import dspy
from pydantic import BaseModel


class EvaluationChallengeAnswerResult(BaseModel):
    goal_alignment: str = None
    goal_alignment_score: float = None
    challenge_understanding: str = None
    challenge_understanding_score: float = None
    hypothesis_coverage: str = None
    hypothesis_coverage_score: float = None
    actionable_insights: str = None
    actionable_insights_score: float = None
    verification_reliability: str = None
    verification_reliability_score: float = None
    data_sufficiency: str = None
    data_sufficiency_score: float = None


class EvaluationChallengeAnswer(dspy.Signature):
    """
    You are a senior insurance strategist and actuary. Your task is to provide a rigorous and critical evaluation of a system-generated analytical conclusion for a given business challenge. Your evaluation must be objective, precise, and deeply rooted in insurance industry principles.

    For each of the following six dimensions, provide a concise, professional comment and a numerical score from 0 (poor) to 5 (excellent). If a dimension scores 3 or lower, you MUST provide specific, actionable recommendations for improvement.

    1.  **Strategic Alignment**: Does the conclusion directly address the core business goal (e.g., improving loss ratio, enhancing customer lifetime value, optimizing underwriting profitability)? Is it strategically relevant to the insurance value chain?
    2.  **Problem Framing & Contextualization**: Does the conclusion demonstrate a sophisticated understanding of the specific insurance context (e.g., personal vs. commercial lines, reinsurance, claims management, distribution channels)?
    3.  **Analytical Depth & Rigor**: Does the analysis rigorously test the underlying hypotheses? Is the methodology sound and appropriate for the insurance-specific problem (e.g., pricing models, reserving techniques, fraud detection algorithms)?
    4.  **Strategic & Operational Value**: Are the recommendations practical and directly translatable into insurance operations (e.g., refining underwriting guidelines, adjusting claims handling protocols, optimizing pricing tiers)? Avoid generic advice.
    5.  **Evidentiary Strength & Transparency**: Is the conclusion supported by credible, transparent evidence? Is there a clear, logical link between the data points (e.g., claim frequency, severity, premium data) and the final insights? The reasoning must be auditable.
    6.  **Data Integrity & Sufficiency**: Is the underlying data sufficient, accurate, and appropriate for the problem? Highlight any potential data gaps or quality issues that could materially affect the conclusion's validity (e.g., incomplete claims history, biased policyholder data).
    """

    challenge = dspy.InputField(description="The original business challenge or question that was posed.")
    conclusion = dspy.InputField(description="The system-generated analytical conclusion that needs to be evaluated.")
    question_evaluation_markdown = dspy.InputField(
        description="Supporting analysis and data insights presented in Markdown format."
    )
    # hypotheses_evaluation_markdown = dspy.InputField(
    #     description="hypotheses analysis results in markdown "
    # )
    response: EvaluationChallengeAnswerResult = dspy.OutputField(
        description="A structured JSON object containing the evaluation scores and comments for each of the six dimensions."
    )

class EvaluationChallengeAnswerModule(dspy.Module):

    def __init__(self):
        self.model = dspy.ChainOfThought(EvaluationChallengeAnswer)

    def forward(self,challenge,conclusion,question_evaluation_markdown):
        return self.model(
            challenge=challenge,
            conclusion=conclusion,
            question_evaluation_markdown=question_evaluation_markdown
            # hypotheses_evaluation_markdown=hypotheses_evaluation_markdown
        )


