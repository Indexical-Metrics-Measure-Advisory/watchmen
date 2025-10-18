import dspy

from watchmen_ai.hypothesis.model.metrics import EmulativeAnalysisMethod


class SuggestMetricAnalysisMethod(dspy.Signature):
    """
    Suggests the most suitable analysis method for a given metric based on current hypothesis
    """

    hypothesis = dspy.InputField(description="The hypothesis to be analyzed")
    hypothesis_description = dspy.InputField(description="A detailed description of the hypothesis")
    context = dspy.InputField(description="The context of the analysis")
    metric = dspy.InputField(description="The metric to be analyzed")
    response: EmulativeAnalysisMethod = dspy.OutputField(
        description="The suggested analysis method for the given metric"
    )


class SuggestMetricAnalysisMethodModule(dspy.Module):

    def __init__(self):
        self.model = dspy.ChainOfThought(SuggestMetricAnalysisMethod)

    def forward(self, hypothesis, hypothesis_description, context, metric):
        return self.model(hypothesis=hypothesis, hypothesis_description=hypothesis_description,
                          context=context, metric=metric)









