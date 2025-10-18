import dspy
from pydantic import BaseModel


class QuestionInsightResult(BaseModel):
    answerForQuestion: str = None
    summaryForHypothesis: str = None
    futureAnalysis: str = None
    futureBusinessAction: str = None


class ConclusionQuestionSign(dspy.Signature):
    """You are a senior insurance strategist and data scientist. Your task is to synthesize the provided data analysis results into a concise, data-driven conclusion for a key business question. Your output must be professional, actionable, and free of jargon.

    **Core Objective:** Deliver a clear, evidence-based answer and define concrete next steps for the business.

    **Instructions:**
    1.  **Direct Answer:** Provide a direct and concise answer to the business question, grounded in the provided data.
    2.  **Data-Driven Rationale:** Summarize the key findings from the hypothesis analysis that support your answer. Explicitly reference the metrics and validation results from the `hypotheses_result_markdown` that led to your conclusion.
    3.  **Strategic Next Actions:**
        *   **Future Analysis:** Recommend specific, high-impact future analyses. What new questions should be investigated? What additional data could refine the insights?
        *   **Business Actions:** Propose concrete, actionable business strategies based on the findings. What immediate steps should the business take to capitalize on this insight?
    """
    challenge = dspy.InputField(description="The overarching business challenge or goal.")
    question = dspy.InputField(description="The specific business question to be answered.")
    hypotheses_result_markdown = dspy.InputField(description="A Markdown-formatted table containing the results of the hypothesis analysis, including metrics, values, and validation flags.")
    response: QuestionInsightResult = dspy.OutputField(description="A structured object containing the answer, hypothesis summary, and suggestions for future analysis and actions.")


class ConclusionQuestionModule(dspy.Module):

    def __init__(self):
        self.model = dspy.ChainOfThought(ConclusionQuestionSign)

    def forward(self, challenge,question,hypotheses_result_markdown):
        return self.model(challenge = challenge,question = question,
                          hypotheses_result_markdown =hypotheses_result_markdown)
