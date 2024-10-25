from typing import Any

from langchain_core.language_models import BaseLanguageModel
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel

from watchmen_ai.llm.azure_model_loader import AzureModelLoader
from watchmen_ai.task.base_action import BaseAction

format_instructions = """
     classification:  "" 
    """


class Parameter(BaseModel):
    classification: str = None


class ConnectedSpaceIntentTaskRecognition(BaseAction):

    def run(self, data: Any, ai_model: BaseLanguageModel):
        input_message = data

        assistant_system_message = """You are a expert for below question \
                t"""
        user_prompt = """
                    Classify the user  input value :{input} into one of the following intent: 
                    - overview_connected_space: Overview of connected space
                    - find_data_mart: Find data mart based on business target

                    example:
                    - input: " Overview domain structure of connected space "
                      output: "overview_connected_space"     

                    - input: "Find data mart based for generate agency performance report" 
                      output : "find_data_mart"           


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
    action = ConnectedSpaceIntentTaskRecognition()
    action.run("Overview domain structure of connected space", AzureModelLoader().get_llm_model())
