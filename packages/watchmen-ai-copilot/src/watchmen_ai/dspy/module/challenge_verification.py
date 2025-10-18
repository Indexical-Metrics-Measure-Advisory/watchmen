from typing import List

import dspy
from pydantic import BaseModel


class ClarityAssessment(BaseModel):
    is_specific: bool = False
    specificity_score: float = 0.0  # 0-1 score
    specificity_feedback: str = ""
    
class OperabilityAssessment(BaseModel):
    is_actionable: bool = False
    data_analyzable: bool = False
    strategy_adjustable: bool = False
    operability_feedback: str = ""

class ImpactAssessment(BaseModel):
    impact_level: str = ""  # Low/Medium/High
    potential_impact_areas: List[str] = []
    impact_feedback: str = ""

class VerificationResult(BaseModel):
    verification_pass: bool = False
    reason: str = ""
    clarity: ClarityAssessment= ClarityAssessment()
    operability: OperabilityAssessment = OperabilityAssessment()
    impact: ImpactAssessment = ImpactAssessment()
    suggested_challenge: str = ""  # Suggested rephrased challenge if needed

class Verification(dspy.Signature):
    """You are a senior insurance strategist. Your task is to rigorously verify a business challenge based on its clarity, operability, and strategic impact. Your feedback must be concise, professional, and provide actionable suggestions for improvement.

    **Core Objective:** Assess if the `business_challenge` is well-defined and strategically valuable for an insurance context. If not, provide a refined `suggested_challenge`.

    **Verification Criteria:**

    1.  **Clarity (Specificity & Focus):**
        - **Is it Specific?** Does the challenge target a precise insurance metric (e.g., loss ratio, customer lifetime value, claim frequency) or a specific business unit (e.g., underwriting, claims, marketing)?
        - **Is it Unambiguous?** Is the language clear and free of vague terms?
        - **Feedback:** If unclear, provide a concise `specificity_feedback` explaining *why* it's ambiguous and how to focus it.

    2.  **Operability (Actionability & Feasibility):**
        - **Is it Data-Analyzable?** Can this challenge be addressed using typical insurance datasets (e.g., policy data, claims data, customer data)?
        - **Is it Strategically Adjustable?** Can the insights from the analysis lead to concrete changes in insurance strategy, operations, or product design?
        - **Feedback:** If not operable, provide direct `operability_feedback` on what data or strategic levers are missing.

    3.  **Impact (Strategic Value):**
        - **What is the Potential Impact?** Evaluate the potential effect on core insurance pillars: Profitability (e.g., underwriting margin), Growth (e.g., market share), or Risk Management (e.g., portfolio stability).
        - **Identify Impact Areas:** List the specific `potential_impact_areas` (e.g., 'Underwriting Profitability', 'Customer Retention', 'Claims Expense Reduction').
        - **Feedback:** Provide `impact_feedback` that justifies the assigned `impact_level` (High/Medium/Low).

    **Output Requirements:**
    - Your final `VerificationResult` must be decisive.
    - If `verification_pass` is `False`, the `reason` must be explicit and the `suggested_challenge` must be a significantly improved, actionable version of the original.
    """

    business_challenge = dspy.InputField(desc="The insurance-related business challenge to be verified.")
    business_challenge_description = dspy.InputField(desc="A detailed description of the business challenge, providing context.")
    response: VerificationResult = dspy.OutputField(desc="A structured verification result assessing the challenge's clarity, operability, and impact, with a suggested revision if necessary.")


class ChallengeVerification(dspy.Module):
    def __init__(self):
        self.verify = dspy.ChainOfThought(Verification)

    def forward(self, business_challenge, business_challenge_description):
        return self.verify(business_challenge=business_challenge, business_challenge_description=business_challenge_description)
