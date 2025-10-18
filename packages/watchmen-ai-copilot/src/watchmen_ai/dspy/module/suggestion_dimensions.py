from typing import List

import dspy
from pydantic import BaseModel


class SuggestedDimensionResult(BaseModel):
    """
    Represents a suggested dimension with its name and type.
    """
    dimension_name: str
    importance: float


class SuggestingDimensions(dspy.Signature):
    """
    As a senior insurance business analyst and data scientist with extensive expertise in insurance analytics, your mission is to strategically recommend the most impactful analysis dimensions for investigating complex business problems.

    **Core Objective:**
    Identify and prioritize the most valuable dimensions that will yield actionable insights for the given business question and hypothesis validation.

    **Strategic Analysis Framework:**
    1.  **Context Deep Dive**: Thoroughly analyze the business question's scope, the hypothesis's testability, and the relationship between available metrics and dimensions.
    
    2.  **Dimension Relevance Assessment**: Evaluate each available dimension based on:
        - Direct relevance to the business question
        - Potential to validate or refute the hypothesis
        - Historical significance in insurance analytics
        - Segmentation power for meaningful insights
        - Data quality and availability considerations
        
    **Time Dimension Guidelines:**
    - For temporal analysis, ALWAYS prioritize aggregated time periods: Monthly, Quarterly, and Yearly dimensions
    - NEVER suggest daily-level time dimensions as they provide excessive granularity for strategic business analysis
    - Monthly analysis enables trend identification and seasonal pattern detection
    - Quarterly analysis supports business cycle evaluation and performance reviews
    - Yearly analysis facilitates long-term strategic planning and annual comparisons
    - Avoid day-level granularity which introduces noise and reduces analytical clarity
    
    3.  **Impact Scoring Methodology**: Assign importance scores (0.0-1.0) based on:
        - **1.0**: Critical dimension essential for analysis (e.g., primary risk factors)
        - **0.8-0.9**: High-impact dimension with strong analytical value
        - **0.6-0.7**: Moderate-impact dimension providing supporting insights
        - **0.4-0.5**: Low-impact dimension with limited analytical value
        - **0.0-0.3**: Minimal or no relevance to the current analysis
    
    4.  **Strategic Prioritization**: Select exactly the top 3-4 most impactful dimensions (NEVER exceed 4) that:
        - Collectively provide comprehensive analytical coverage
        - Avoid redundancy and overlap
        - Enable actionable business recommendations
        - Support statistical significance in analysis
    
    5.  **Quality Assurance**: Ensure selected dimensions:
        - Are mutually exclusive where possible
        - Provide complementary analytical perspectives
        - Support both descriptive and predictive analytics
        - Enable drill-down capabilities for deeper insights

    **Critical Constraints:**
    - MAXIMUM 4 dimensions in response (strictly enforced)
    - Each dimension must have clear business justification
    - Importance scores must reflect genuine analytical value
    - Focus on dimensions that drive business decisions
    """

    business_question = dspy.InputField(description="A clear and specific business question that needs to be answered through data analysis.")
    hypothesis = dspy.InputField(description="A proposed explanation or assumption related to the business question that needs to be tested.")
    metrics = dspy.InputField(description="A list of available quantitative measures (e.g., 'Claim Amount', 'Policy Count') for the analysis.")
    dimensions = dspy.InputField(description="A list of available categorical attributes (e.g., 'Region', 'Product Type') for segmenting the data.")
    response: List[SuggestedDimensionResult] = dspy.OutputField(
        description="A strategically curated list of MAXIMUM 4 recommended analysis dimensions, each with a justified importance score (0.0-1.0). Must contain 3-4 dimensions only, never exceed 4. For time-related dimensions, ONLY suggest Monthly, Quarterly, or Yearly periods - NEVER daily granularity.")


class SuggestingDimensionsModule(dspy.Module):
    """
    Module for suggesting dimensions based on business questions, hypotheses, metrics, and dimensions.
    """

    def __init__(self):
        self.model = dspy.ChainOfThought(SuggestingDimensions)

    def forward(self, business_question, hypothesis, metrics, dimensions):
        return self.model(business_question=business_question, hypothesis=hypothesis,
                          metrics=metrics, dimensions=dimensions)
