from typing import Any

from langchain_core.language_models import BaseLanguageModel
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

from watchmen_ai.llm.azure_model_loader import AzureModelLoader
from watchmen_ai.task.base_action import BaseAction


class ConfirmMessageGenerate(BaseAction):

    def run(self, data: Any, ai_model: BaseLanguageModel):
        input_message, language = data

        assistant_system_message = """You are a  expert for below question \
                t"""
        user_prompt = """
                    Please help to use below language summarize a chatbot confirmation message(Small and short)  base on below history content
                    history:
                    '''
                    {history}
                    '''
                    
                    example : 
                    Pls confirm ,summary indicators, based on  for month or year
                    
                    language:{language}
                    
                    Only return confirmation message content
                    """

        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", assistant_system_message),
                ("user", user_prompt)
            ]
        )

        parser = StrOutputParser()
        chain = prompt | ai_model | parser
        res = chain.invoke({"history": input_message, "language": language})

        print(res)
        return res

    def describe(self):
        return "This action is used to recognize the parameter from the input message"


if __name__ == "__main__":
    action = ConfirmMessageGenerate()
    action.run(([{"q": "Summarize Business Target"}, {"q": "business_target", "a": "利益"}], "jp"),
               AzureModelLoader().get_llm_model())
