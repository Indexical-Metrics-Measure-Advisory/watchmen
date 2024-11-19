from langchain_core.language_models import BaseLanguageModel
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate

from watchmen_ai.llm.llm_builder import LlmModelBuilder
from watchmen_ai.task.base_action import BaseAction, TaskContext
from watchmen_model.admin import Factor

format_json = """
{
                    factorId: 'unique factor id',
                    name: 'Factor short Name like table column name',
                    label: "Label name for factor",
                    type: text|number|date|sequence
                    description:'factor detail description'
}

"""

class AdminGenerateContext(TaskContext):
    nlp : str


class GenerateTopicFactorsAction(BaseAction):

    def run(self, nlp, lang_model: BaseLanguageModel):
        assistant_system_message = """You are a insurance expert. \
         to best answer the question and only return json body"""

        user_prompt = """

            please help to use below steps to give suggestion for domain factors 
                1. suggest more than 10 domain factors for below domain name
                2. convert factors to json  with  below format_instructions

            INPUT:
            {domain}            

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

        parser = JsonOutputParser(pydantic_object=Factor)

        chain = prompt | lang_model | parser
        res = chain.invoke({"domain": nlp, "json_format": format_json})

        return res


if __name__ == "__main__":
    # action = GenerateTopicFactorsAction()
    # model = LlmModelBuilder.get_llm_model()
    #
    # # model = get_gpt_4()
    # action.run(
    #     "Quotation", model)

    print(4355 -2475 - 1373+30-240)

    print(4355000000/8)
    print(30000000/3)
    print(2475000000/3)
    print(1373000000/4)
    print(240000000/3)

