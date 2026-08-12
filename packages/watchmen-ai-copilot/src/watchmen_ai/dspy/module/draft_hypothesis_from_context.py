import dspy

analysis_methods = """
Trend Analysis,Distribution Analysis,Comparison Analysis,Correlation Analysis,Composition Analysis,Features importance
"""


class DraftHypothesisFromContextSignature(dspy.Signature):
    """
    You are a seasoned data analyst. Given the context of a BI chart, alert or chat conversation,
    draft a single, specific and testable hypothesis about the observed metric behavior.
    The hypothesis may span multiple metrics when they interact.

    **Guidelines:**
    1. The hypothesis title must be a clear, concise statement of the suspected relationship or pattern.
    2. The description must explain the rationale and how the given dimensions, time range and filters
       can be used to validate the hypothesis with data.
    3. The analysis method must be exactly one of the provided analysis methods.
    """

    metrics = dspy.InputField(description="The comma-separated metric names covered by the hypothesis")
    dimensions = dspy.InputField(description="The dimensions available to break down the metrics")
    time_range = dspy.InputField(description="The time range of the observed data")
    filters = dspy.InputField(description="The filters applied on the observed data")
    analysis_methods = dspy.InputField(description="The candidate analysis methods, one must be picked exactly")
    title: str = dspy.OutputField(description="A clear, concise hypothesis statement")
    description: str = dspy.OutputField(description="The rationale and how to validate the hypothesis with data")
    analysisMethod: str = dspy.OutputField(description="Exactly one of the candidate analysis methods")


class DraftHypothesisFromContextModule(dspy.Module):

    def __init__(self):
        self.model = dspy.ChainOfThought(DraftHypothesisFromContextSignature)

    def forward(self, metrics, dimensions, time_range, filters):
        return self.model(metrics=metrics, dimensions=dimensions, time_range=time_range, filters=filters,
                          analysis_methods=analysis_methods)
