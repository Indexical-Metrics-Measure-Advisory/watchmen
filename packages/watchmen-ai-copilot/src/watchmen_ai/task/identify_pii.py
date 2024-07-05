from langchain_core.language_models import BaseLanguageModel
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough

from watchmen_ai.llm.llm_builder import LlmModelBuilder
from watchmen_ai.task.base_action import BaseAction
from watchmen_model.admin import Factor


class IdentifyPIIAction(BaseAction):

    def run(self, nlp, lang_model: BaseLanguageModel):
        assistant_system_message = """You are a insurance expert. \
         to best answer the question and only return json """

        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", assistant_system_message),
                ("user", """
                please help to identify PII information in below content return json format with attribute 'PII'
               
                ## content : {content} 
                """
                 )
            ]
        )

        parser = JsonOutputParser(pydantic_object=Factor)

        chain = ({"content": RunnablePassthrough()}
                 | prompt
                 | lang_model
                 | parser

                 )

        res = chain.invoke(nlp)
        print(res)
        return res


if __name__ == "__main__":
    action = IdentifyPIIAction()
    model = LlmModelBuilder.get_llm_model()

    # model = get_gpt_4()
    action.run(
        """
        [
        {
            factorId: "123131",
            name: "Policy_Type",
            label: "Policy Type",
            type: FactorType.TEXT,
            description:'Different types of policies such as health, life, auto, home, etc.'
 
        },
        {
            factorId: "123131",
            name: "Id Account",
            label: "Id Account",
            type: FactorType.NUMBER,
            description:'Id Account'
        },
        {
            factorId: "123131",
            name: "Coverage_Amount",
            label: "Coverage Amount",
            type: FactorType.NUMBER,
            description:'[$ Coverage Amount]'
        },
        {
            factorId: "123131",
            name: "Policy Term",
            label: "Policy Term",
            type: FactorType.DATE,
            description:'The duration of the policy coverage period.'
        },{
            factorId: "123131",
            name: "Premium_Payment_Frequency",
            label: "Premium Payment Frequency",
            type: FactorType.TEXT,
            description:'Monthly/Quarterly/Annually'
        },
        {
            factorId: "123131",
            name: "Riders_Cost",
            label: "Riders Cost",
            type: FactorType.NUMBER,
            defaultValue: "defaultValue",
            description:'$ Cost for Each Rider'
        },
        {
            factorId: "123131",
            name: "Discounts",
            label: "Discounts",
            type: FactorType.NUMBER,
            description:'Details on any applicable discounts'
        },
        {
            factorId: "123131",
            name: "Base_Premium",
            label: "Base Premium",
            type: FactorType.NUMBER,
            description:'$ Base Premium Amount'
        },
        {
            factorId: "123131",
            name: "Total Premium",
            label: "Total Premium",
            type: FactorType.NUMBER,
            description:'$ Total Premium Amount'
        },
        {
            factorId: "123131",
            name: "Primary_Beneficiary",
            label: "Primary Beneficiary",
            type: FactorType.TEXT,
            description:'Name, Relationship, Percentage of Benefit'
        }
        ]
        
        """, model)
