import dspy

from watchmen_ai.hypothesis.model.data_story import BusinessProblemForDspy

analysis_method = """
Trend Analysis,Distribution Analysis,Comparison Analysis,Correlation Analysis,Composition Analysis,features Importances,t-test,ANOVA,
"""


class ProblemWithCurrentProblemsSignature(dspy.Signature):
    """
    You are a strategic insurance analytics consultant with deep expertise in actuarial science and data-driven decision making. Your mission is to formulate **one sophisticated business problem** that delves into the nuanced aspects of the insurance challenge. The problem should reveal complex patterns, hidden relationships, or emerging trends that are not immediately apparent, while being distinct from the existing problems in the **current_problem_list** (markdown table format).

    **Core Objective:** Move beyond surface-level inquiries to uncover systemic patterns and strategic opportunities that drive business value.

    **Guidelines for Crafting Advanced Business Problems:**
    1. **Multi-Dimensional Analysis:** The problem should integrate multiple business aspects (e.g., risk assessment, customer behavior, operational efficiency, market dynamics) to uncover non-obvious relationships. For example, instead of "What factors affect claim frequency?", consider "How do seasonal patterns in policy modifications correlate with claim severity across different customer segments, and what does this reveal about our risk assessment models?"

    2. **Data-Driven Sophistication:** 
       - Frame the problem to leverage advanced analytical methods available in the dataset
       - Consider temporal patterns, interaction effects, and conditional relationships
       - Enable the discovery of actionable insights that challenge conventional wisdom

    3. **Strategic Value Chain:**
       - Position the problem within a broader analytical framework
       - Ensure it builds upon or complements existing problems while maintaining distinctiveness
       - Design it to unlock insights that can influence strategic decision-making

    4. **Implementation Focus:**
       - Ensure the problem is specific enough to be analyzed with available data
       - Structure it to yield quantifiable metrics and actionable recommendations
       - Consider both immediate analytical needs and long-term strategic implications

    Your goal is to craft a sophisticated business problem that drives deep analytical exploration and yields strategic insights for insurance operations.
    """

    challenge = dspy.InputField(description="The business challenge in the insurance domain to be addressed")
    challenge_description = dspy.InputField(description="A detailed description of the business challenge")
    current_problem_list: str = dspy.InputField(description="A markdown table of existing business problems to avoid duplication")
    response: BusinessProblemForDspy = dspy.OutputField(
        description="A single new business problem that is distinct from existing ones and suitable for guiding the analysis"
    )


class GenerateProblemWithCurrentProblemsModule(dspy.Module):

    def __init__(self):
        self.model = dspy.ChainOfThought(ProblemWithCurrentProblemsSignature)

    def forward(self, challenge, challenge_description, current_problem_list):
        return self.model(challenge=challenge, challenge_description=challenge_description,
                          current_problem_list=current_problem_list)
