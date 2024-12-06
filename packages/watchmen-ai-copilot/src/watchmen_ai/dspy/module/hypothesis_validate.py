import dspy


class HypothesisValidateSignature(dspy.Signature):
    """your task is to validate the hypothesis data based on the given context , data, analysis method ,evidence and result """

    context = dspy.InputField()
    analysis_method: str = dspy.InputField()
    data = dspy.InputField()
    evidence = dspy.InputField()
    result = dspy.InputField()
    response = dspy.OutputField(desc="The response of the hypothesis validate result include insight , summary ,reason and result ")


class HypothesisValidateModule(dspy.Module):
    def __init__(self):
        self.verify = dspy.ChainOfThought(HypothesisValidateSignature)

    def forward(self, content, context):
        return self.verify(input=content, context=context)
