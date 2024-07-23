from langchain_core.language_models import BaseLanguageModel
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel
from typing import Any, List

from watchmen_ai.llm.azure_model_loader import AzureModelLoader
from watchmen_ai.task.base_action import BaseAction

format_instructions = """
     intent_name:  "name of  analysis intent" ,
     analysis_dimension: "Analysis Query Dimensions",
     analysis_metrics: "Analysis Quantitative Indicators",
     analysis_methods: "Analysis Methods for example , sum ,count ,avg .etc"
    """


class DerivedObjectiveIntent(BaseModel):
    objective_intent: str = None
    analysis_dimension: List[str] = []
    analysis_metrics: List[str] = []
    analysis_methods: str = None


class GenerateDerivedObjectiveRecommend(BaseAction):

    def run(self, data: Any, ai_model: BaseLanguageModel):
        targets: List[str] = data

        assistant_system_message = """You are a insurance expert. \
                 to best answer the question and only return json body"""

        user_prompt = """

                    please help to use below steps to generate recommend intents for derived objectives
                        1. generate 4 intents base on below below business targets and actions
                        2. convert intents to json  with  below format_instructions

                    targets:
                    {targets}         
                    actions:
                    {actions}

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

        parser = JsonOutputParser(pydantic_object=DerivedObjectiveIntent)

        chain = prompt | ai_model | parser
        res = chain.invoke({"targets": targets,"actions":["概览目标","insight_for_business_target"] ,"json_format": format_instructions})
        print(res)
        return res

    def describe(self):
        return "Generate Derived Objective Recommend Intents"


if __name__ == "__main__":
    action = GenerateDerivedObjectiveRecommend()
    action.run(["保険料単価","保有件数"], AzureModelLoader().get_llm_model())
