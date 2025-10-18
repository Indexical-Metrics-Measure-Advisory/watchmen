import dspy
from pydantic import BaseModel


class ReportResponse(BaseModel):
    answer: str = None
    reason: str = None



class AskForReportSign(dspy.Signature):
    """
    As a professional insurance business analyst, your task is to generate a response based on the provided metric data, analysis report, and customer question.

    **Instructions:**
    1. **Synthesize Information:** Review the `metric_data` containing metric data, the `analysis_report`, and the `customer_question`.
    2. **Directly Answer the Question:** Provide a clear response to the customer's question.
    3. **Multi-faceted Perspective:** Formulate the response from multiple angles such as strategic, operational, and financial.
    4. **Data-driven Evidence:** Use specific metrics and data from the report to support your points.
    5. **Actionable Insights:** Provide clear, concise, and business-friendly insights. Suggest potential follow-up actions.
    6. **Structured Output:** Your output should be a structured `ReportResponse`.
    """
    metric_data = dspy.InputField(description="Metric data.")
    analysis_report = dspy.InputField(description="Analysis report.")
    customer_question = dspy.InputField(description="Customer's question.")
    response: ReportResponse = dspy.OutputField(description="Structured response for the report request and use markdown format.")


class AskForReportModule(dspy.Module):

    def __init__(self):
        self.model = dspy.ChainOfThought(AskForReportSign)

    def forward(self, metric_data, analysis_report, customer_question):
        return self.model(metric_data=metric_data,
                          analysis_report=analysis_report,
                          customer_question=customer_question)