

import dspy
from pydantic import BaseModel

from watchmen_ai.dspy.model.data_story import SubQuestion
from watchmen_ai.markdown.document import MarkdownDocument
from watchmen_ai.router.utils import convert_data_to_markdown


class InsightResult(BaseModel):
    answerForQuestion: str = None
    summaryForHypothesis: str = None
    futureAnalysis: str = None
    futureBusinessAction: str = None


class InsightQuestionResultSign(dspy.Signature):
    """ Insight Question Result based on Question data and context ,
     pls use business language in insurance domain to explain the data results,make it simple and easy to understand
     """
    question: str = dspy.InputField(desc="business question")
    context: str = dspy.InputField(desc="context for insight data")
    response: InsightResult = dspy.OutputField(desc="insight result")




def convert_question_to_markdown(question: SubQuestion):
    markdown_document = MarkdownDocument()
    markdown_document.append_heading(question.question, 2)
    markdown_document.append_text(question.reason)
    for hypothesis in question.hypothesis:
        markdown_document.append_heading(f'Hypothesis {hypothesis["hypothesis"]}', 3)
        markdown_document.append_text(f'**Evidence:** {hypothesis["evidence"]}')
        markdown_document.append_text(f'**Result:** {hypothesis["result"]}')
        markdown_document.append_text(f'**Analysis Method:** {hypothesis["analysisMethod"]}')

        markdown_document = convert_data_to_markdown(hypothesis["dataResult"],markdown_document)

    return markdown_document.contents()


class InsightQuestionResult(dspy.Module):

    def __init__(self):
        self.model = dspy.ChainOfThought(InsightQuestionResultSign)

    def forward(self, question: SubQuestion, context: str):
        question_markdown = convert_question_to_markdown(question)
        return self.model(question=question_markdown, context=context)
