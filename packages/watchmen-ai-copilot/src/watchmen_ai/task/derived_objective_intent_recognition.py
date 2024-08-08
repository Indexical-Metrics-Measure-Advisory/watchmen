from langchain_core.language_models import BaseLanguageModel
from langchain_core.output_parsers import JsonOutputParser, StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel
from typing import Any, List

from watchmen_ai.llm.azure_model_loader import AzureModelLoader
from watchmen_ai.task.base_action import BaseAction

format_instructions = """
     classification:  "" 
    """


class Parameter(BaseModel):
    classification: str = None


class ObjectiveIntentTaskRecognition(BaseAction):

    def run(self, data: Any, ai_model: BaseLanguageModel):
        input_message = data

        assistant_system_message = """You are a expert for below question \
                t"""
        user_prompt = """
                    Classify the user  input value :{input} into one of the following intent: 
                    - summarize:Summarize Business Target
                    - query_metrics:Query metrics YoY/MoM
                    - exception_metrics:View data that deviates from the baseline
                    
                    example:
                    - input: "先月と比べて大きく変化したところを教えてください。"
                      output: "exception_metrics"     
                      
                    - input: "ビジネスの状況を教えて下さい" 
                      output : "summarize"           


                    Provide the classification as a single word matching the intent. If no clear intent can be determined, output "unknown" and return only classification .

                    """

        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", assistant_system_message),
                ("user", user_prompt)
            ]
        )

        parser = StrOutputParser()
        chain = prompt | ai_model | parser
        res = chain.invoke({"input": input_message, "format_instructions": format_instructions})
        result = res.replace("Classification: ", "").replace(".", "")
        print(result)
        return result

    def describe(self):
        return "This action is used to recognize the parameter from the input message"


if __name__ == "__main__":
    action = ObjectiveIntentTaskRecognition()
    action.run("先月と比べて大きく変化したところを教えて", AzureModelLoader().get_llm_model())
