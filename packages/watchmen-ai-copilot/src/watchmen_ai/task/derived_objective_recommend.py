from langchain_core.language_models import BaseLanguageModel
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate
from typing import Any, List

from watchmen_ai.task.base_action import BaseAction

format_instructions = """
     objective_intent:  "objective analysis intent" ,
     analysis_dimension: "Analysis Dimensions",
     analysis_metrics: "Analysis Metrics",
     analysis_methods: "Analysis Methods"
    """


class GenerateDerivedObjectiveRecommend(BaseAction):

    def run(self, data: Any, ai_model: BaseLanguageModel):
        targets: List[str] = data

        assistant_system_message = """You are a insurance expert. \
                 to best answer the question and only return json body"""

        user_prompt = """

                    please help to use below business targets and actions  to give suggestion for intent
                        1. suggest 4 intents base on below below business targets and actions
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

        parser = JsonOutputParser(pydantic_object=Factor)

        chain = prompt | ai_model | parser
        res = chain.invoke({"targets": targets, "json_format": format_instructions})

        return res

    def describe(self):
        return "Generate Derived Objective Recommend Intents"


if __name__ == "__main__":
    action = GenerateDerivedObjectiveRecommend()
    action.run(None, None)
