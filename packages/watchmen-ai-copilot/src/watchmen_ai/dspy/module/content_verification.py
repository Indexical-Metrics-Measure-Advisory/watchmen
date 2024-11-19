import dspy
from pydantic import BaseModel


class VerificationResult(BaseModel):
    verification_pass: bool = False
    reason: str = ""


class Verification(dspy.Signature):
    """your task is to verify the content is about insurance domain and if false pls return the reason"""

    content = dspy.InputField()
    question: str = dspy.InputField()
    response: VerificationResult = dspy.OutputField(
        desc="The response to verify the content.")


class ContentVerification(dspy.Module):
    def __init__(self):
        self.verify = dspy.ChainOfThought(Verification)

    def forward(self, question, content):
        return self.verify(question=question, content=content)
