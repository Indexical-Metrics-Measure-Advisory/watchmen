from typing import List

import dspy
from pydantic import BaseModel


class VerificationResult(BaseModel):
    verification_pass: bool = False
    reason: str = ""


class Verification(dspy.Signature):
    """your task is to verify the question and answer whether is enough for answer the business challenge
    """

    context = dspy.InputField(desc="context of the content")
    business_challenge = dspy.InputField(desc="business challenge for insurance analysis")
    question_answers = dspy.InputField(desc="question and answer for insurance analysis")
    response: VerificationResult = dspy.OutputField(
        desc="this response will contain the verification result")


class ChallengeVerification(dspy.Module):
    def __init__(self):
        # dspy.configure(lm=dspy.LM("gpt-3.5-turbo"))
        self.verify = dspy.ChainOfThought(Verification)

    def forward(self, question, content):
        return self.verify(question=question, content=content)
