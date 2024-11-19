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


class DateParameterRecognition(BaseAction):

    def run(self, data: Any, ai_model: BaseLanguageModel):
        input_message = data

        assistant_system_message = """You are a  expert for below question \
                t"""
        user_prompt = """
                    Classify the user date input value :{input} into one of the following timeframes: this month, last month, last 6 months, this week, last week, yesterday, today, tomorrow.

                    Provide the classification as a single word matching the timeframe. If no clear timeframe can be determined, output "unknown" .return only classification .
                    
                    **Examples:**
                    User input: "Give me data from recent months"
                    Classification: last 6 months
                    
                    User input: "Current month"
                    Classification: this month
            
                    User input: "Show me results for the past week"
                    Classification: last week
                    
                    User input: "What about the future?"
                    Classification: unknown
                      ```
                    
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
    action = DateParameterRecognition()
    action.run("過去6か月", AzureModelLoader().get_llm_model())
