from typing import Any

from langchain_core.language_models import BaseLanguageModel
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel

from watchmen_ai.llm.azure_model_loader import AzureModelLoader
from watchmen_ai.task.base_action import BaseAction

format_instructions = """
     business_target:  "" 
     time_range:  ""
     rate:  ""
    """


class Parameter(BaseModel):
    business_target: str = None
    time_range: str = None
    rate: str = None


class ObjectiveIntentTaskParameter(BaseAction):

    def run(self, data: Any, ai_model: BaseLanguageModel):
        input_message = data

        assistant_system_message = """You are a expert for below question \
                t"""
        user_prompt = """
                    Please help extract task parameter  from input value :{input}  with below parameter type and return json format like below output:
                    - business_target: for insurance domain like  indicator , metrics or target .etc
                    - time_range : for example last month , last quarter or last year .ext
                    - rate :  for example  10% , 20% or 30% .etc
                    
                    

                      OUTPUT:
                        ```json
                        {json_format}
                        ```
                    """

        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", assistant_system_message),
                ("user", user_prompt)
            ]
        )

        parser = JsonOutputParser(pydantic_object=Parameter)
        chain = prompt | ai_model | parser
        res = chain.invoke({"input": input_message, "json_format": format_instructions})
        # result = res.replace("Classification: ", "").replace(".", "")
        print(res)
        return res

    def describe(self):
        return "This action is used to recognize the parameter from the input message"


if __name__ == "__main__":
    action = ObjectiveIntentTaskParameter()
    action.run("Summarize the latest 6-month data on indicator profits", AzureModelLoader().get_llm_model())
