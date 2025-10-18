import dspy
from pydantic import BaseModel


class ChallengeInsightResult(BaseModel):
    answerForConclusion: str = None
    summaryForQuestions: str = None
    futureAnalysis: str = None
    futureBusinessAction: str = None


class ConclusionChallengeSign(dspy.Signature):
    """
    As a senior insurance strategist and data scientist, your task is to deliver a data-driven conclusion for the given business challenge, based on the synthesis of multiple question analysis results. Your conclusion must be professional, concise, and actionable.

    **Core Objective:**
    Transform complex analysis results into a clear, evidence-based strategic summary that directly addresses the business challenge and outlines concrete next steps.

    **Instructions:**
    1.  **Direct Conclusion:** Begin with a direct answer to the core `challenge`. Synthesize the key findings from the `question_result_markdown` to form a cohesive summary.
    2.  **Data-Driven Rationale:** Your conclusion is meaningless without data. You **must** explicitly reference the key metrics, findings, and validation flags from the analysis that support your conclusion. State *why* the data leads to this conclusion.
    3.  **Strategic Next Actions:** Define clear, actionable next steps. Your recommendations should be practical and divided into two distinct categories:
        *   **Future Analysis:** What specific questions should be investigated next? What additional data could refine the strategy?
        *   **Business Actions:** What immediate, tangible actions should the business take based on the current evidence?
    4.  **Professional & Concise Communication:** Use precise, professional language. Avoid jargon where possible, but maintain a strategic tone. Be direct and eliminate filler content.
    """
    challenge = dspy.InputField(description="The business challenge to be addressed.")

    question_result_markdown = dspy.InputField(description="A markdown-formatted string containing the analysis results for various questions related to the challenge.")
    response: ChallengeInsightResult = dspy.OutputField(description="A structured object containing the insights and conclusions for the challenge.")


class ConclusionChallengeModule(dspy.Module):

    def __init__(self):
        self.model = dspy.ChainOfThought(ConclusionChallengeSign)

    def forward(self, challenge,question_result_markdown):
        return self.model(challenge = challenge,
                          question_result_markdown =question_result_markdown)
