import dspy

from watchmen_ai.hypothesis.model.data_story import DataExplain


class ConclusionHypothesisSign(dspy.Signature):
    """
    As an insurance business analyst, interpret data analysis results and provide data-driven insights.
    
    Generate a DataExplain with:
    - conclusion: Data-driven summary referencing specific metrics
    - insight: How metrics impact business
    - recommendation: Concrete actions based on data
    
    Use simple business language and focus on business implications.
    """
    challenge = dspy.InputField(description="The overarching business challenge.")
    question = dspy.InputField(description="The specific question being investigated to address the challenge.")
    hypothesis = dspy.InputField(description="The hypothesis that was tested.")
    analysisMethod = dspy.InputField(description="The analytical method used to test the hypothesis.")
    metrics_markdown = dspy.InputField(description="A markdown table summarizing the key metrics and results from the data analysis.")
    dataExplain: DataExplain = dspy.OutputField(description="A structured explanation of the data, including a conclusion, insights, and recommendations.")


class ExplainDataHypothesisMetricModule(dspy.Module):

    def __init__(self):
        self.model = dspy.ChainOfThought(ConclusionHypothesisSign)

    def forward(self, challenge,question,hypothesis,analysis_method,metrics_markdown):
        # print(metrics_markdown)
        return self.model(challenge = challenge,question = question, hypothesis=hypothesis, analysisMethod=analysis_method,
                          metrics_markdown =metrics_markdown)
