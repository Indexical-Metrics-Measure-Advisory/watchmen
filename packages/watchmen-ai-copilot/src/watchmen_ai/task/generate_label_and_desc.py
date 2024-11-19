from langchain_core.language_models import BaseLanguageModel
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough

from watchmen_ai.llm.llm_builder import LlmModelBuilder
from watchmen_ai.task.base_action import BaseAction
from watchmen_model.admin import Factor


class GenerateTopicDescAction(BaseAction):

    def run(self, nlp, lang_model: BaseLanguageModel):
        assistant_system_message = """You are a insurance expert. \
         to best answer the question and only return json """

        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", assistant_system_message),
                ("user", """
                please help to use below steps to give suggestion for domain factors 
                1. suggest 10 domain factors for below domain name
                2. convert factors to json format  with  format_instructions

                ## factors : {factors} 
               

                """
                 )
            ]
        )

        parser = JsonOutputParser(pydantic_object=Factor)

        chain = ({"domain": RunnablePassthrough()}
                 | prompt
                 | lang_model
                 | parser

                 )

        res = chain.invoke(nlp)
        print(res)
        return res


if __name__ == "__main__":
    action = GenerateTopicDescAction()
    model = LlmModelBuilder.get_llm_model()

    # model = get_gpt_4()
    action.run(
        "Quotation", model)
