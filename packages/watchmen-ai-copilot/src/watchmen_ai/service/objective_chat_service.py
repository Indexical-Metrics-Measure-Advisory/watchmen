from typing import List

from watchmen_ai.lang.lang_service import get_message_by_lang
from watchmen_ai.llm.azure_model_loader import AzureModelLoader
from watchmen_ai.markdown.document import MarkdownDocument
from watchmen_ai.markdown.mermaid.flowchart import  flowchart
from watchmen_ai.model.chat_answer import OngoingCopilotAnswer, CopilotAnswerMarkdown
from watchmen_ai.model.copilot_intent import CopilotIntent, CopilotTask
from watchmen_ai.model.index import ObjectiveIntent, ChatContext, ChatTaskContext
from watchmen_ai.router.utils import build_yes_no_item
from watchmen_ai.service.chat_service import ChatService
from watchmen_ai.session.session_managment import get_session_manager, SessionManager
from watchmen_ai.task.date_parameter_recognition import DateParameterRecognition
from watchmen_indicator_kernel.data import get_objective_data_service, ObjectiveValues, ObjectiveTargetValues, \
    ObjectiveFactorValues
from watchmen_lineage.model.lineage import LineageResult, ObjectiveLineage, RelationshipLineage, ObjectiveTargetLineage, \
    IndicatorLineage, ObjectiveFactorLineage

from watchmen_lineage.service.lineage_service import get_lineage_service
from watchmen_model.indicator import DerivedObjective, Objective, ObjectiveTarget
from watchmen_model.system.ai_model import AIModel


def get_chat_service() -> ChatService:
    return ChatService()







def find_target_name_list(derived_objective: DerivedObjective) -> List[str]:
    objective: Objective = derived_objective.definition
    targets: List[ObjectiveTarget] = objective.targets
    target_names = []
    for target in targets:
        target_names.append(target.name)
    return target_names


def recommend_intent(derived_objective: DerivedObjective,ai_model:AIModel) -> CopilotIntent:
    business_targets:List[str] = find_target_name_list(derived_objective)
    # call action for suggest intent

    # model_loader = load_model_loader_by_type(ai_model.llmProvider)


    # GenerateDerivedObjectiveRecommend().run(business_targets, model_loader.load_model(ai_model))



def call_date_range_intent(message:str ,ai_model:AIModel,language:str="en") -> str:
    action = DateParameterRecognition()
    return action.run(message, AzureModelLoader().get_llm_model())







def chat_on_objective(session_id:str,token:str,message, principal_service,ai_model:AIModel,language:str="en") -> OngoingCopilotAnswer:
    session_manager:SessionManager = get_session_manager()
    chat_service = get_chat_service()
    chat_context :ChatContext = session_manager.get_session(session_id)
    token = chat_context.current_token
    if token:
        task_context:ChatTaskContext = session_manager.find_token_memory(session_id, token)
        if task_context.sub_tasks:
            key = task_context.sub_tasks.pop()
            if key == "time_range":
                result = call_date_range_intent(message,ai_model,language)
                print(result)
                task_context.parameters[key] = result
            else:
                task_context.parameters[key] = message


            if task_context.sub_tasks:
                depend = task_context.sub_tasks[-1]
                answer = OngoingCopilotAnswer(sessionId=session_id, data=[get_message_by_lang(language,depend)])
                return answer
            else:
                answer = OngoingCopilotAnswer(sessionId=session_id, data=[get_message_by_lang(language,"confirm")])
                task_context.confirm = True
                options = build_yes_no_item(token,language)
                for option in options:
                    answer.data.append(option)
                # answer.data.append()
                return answer
        else:
            answer = OngoingCopilotAnswer(sessionId=session_id, data=[message])
            # options = build_yes_no_item(token)
            # for option in options:
            #     answer.data.append(option)
            return answer

    else:
        intent: ObjectiveIntent = chat_service.find_intent(message)
        answer = OngoingCopilotAnswer(sessionId=session_id, data=[intent.intentDescription])
        return answer



def find_target_by_name(objective:Objective,target_name:str) -> ObjectiveTarget:
    targets:List[ObjectiveTarget] = objective.targets
    for target in targets:
        if target.name == target_name:
            return target
    return None


def find_relationship_lineage_by_objective_id(lineage_result:LineageResult,target_cid_:str) -> RelationshipLineage:
    if lineage_result.relations:
        for relationship in lineage_result.relations:
            if relationship.cid_ == target_cid_:
                return relationship

    return None


def find_cid_for_target(objective_lineage:ObjectiveLineage,target_name:str) -> ObjectiveTargetLineage:
    targets:List[ObjectiveTargetLineage] = objective_lineage.targets
    for target in targets:
        if target.name == target_name:
            # print(target)
            return target
    return None


def build_node_name(node_name,current_value,previous_value,chain_value,language):
    name = get_message_by_lang(language,"node_name")
    return name.replace("{name}",node_name).replace("{current}",f"{current_value:.2f}").replace("{previous}",f"{previous_value:.2f}").replace("{chain}",f"{chain_value:.2f}")





def find_indicator_by_cid(objective_lineage:ObjectiveLineage,cid:str)->ObjectiveFactorLineage:
    indicators :List[ObjectiveFactorLineage] = objective_lineage.factors
    for indicator in indicators:
        if indicator.cid_ == cid:
            return indicator
    return None

def find_values_by_id(values:ObjectiveValues,uuid:str)->ObjectiveTargetValues:
    for target in values.targets:
        if target.target.uuid == uuid:
            return target
    return None


def find_values_by_name(values:ObjectiveValues, name)->ObjectiveTargetValues:
    for target in values.targets:
        if target.target.name == name:
            return target
    return None


def find_factor_value_by_id(values:ObjectiveValues,uuid:str)->ObjectiveFactorValues:
    for factor in values.factors:
        if factor.uuid == uuid:
            return factor
    return None


def build_flowchat_by_lineage_result_and_values(lineage_result:LineageResult,values:ObjectiveValues,language) -> str:
    flowchart.set_layout(flowchart.layout_topToBottom)
    objective : ObjectiveLineage= lineage_result.objectives[0]
    target_lineage = find_cid_for_target(objective,objective.name)
    uuid = target_lineage.uuid



    print("values",values.json())
    target_value = find_values_by_id(values,uuid)
    print("target_value",target_value)


    target_cid_ = target_lineage.cid_
    n1 = flowchart.add_node(build_node_name(objective.name,target_value.currentValue,target_value.previousValue,target_value.chainValue,language), shape=1)
    a = flowchart.add_arrow(type=flowchart.arrowType_normalArrow)



    relationship:RelationshipLineage = find_relationship_lineage_by_objective_id(lineage_result,target_cid_)


    node_list = []
    for from_relation in relationship.from_:
        cid = from_relation.cid_
        if cid.startswith("OBJECTIVE-INDICATOR"):
            indicator:IndicatorLineage = find_indicator_by_cid(objective,cid)
            value = find_values_by_name(values,indicator.name)
            if value:
                n = flowchart.add_node(build_node_name(indicator.name,value.currentValue,value.previousValue,value.chainValue,language))
                node_list.append(n)
            else:
                factor_value = find_factor_value_by_id(values,indicator.uuid)
                if factor_value:
                    n = flowchart.add_node(build_node_name(indicator.name,factor_value.currentValue,factor_value.previousValue,factor_value.chainValue,language))
                    node_list.append(n)
                else:
                    n = flowchart.add_node(indicator.name)
                    node_list.append(n)

    flowchart.link(n1, node_list, a)

    text = flowchart.evaluate()

    return text







def build_summary_markdown_for_business_target(objective:Objective,target:str,principal_service,language:str="en") -> CopilotAnswerMarkdown:
    lineage_service = get_lineage_service()
    markdown_answer = CopilotAnswerMarkdown()
    md = MarkdownDocument()
    md.append_heading(get_message_by_lang(language,"Summarize")+" {}".format(target),2)

    target:ObjectiveTarget = find_target_by_name(objective,target)


    objective_data_service = get_objective_data_service(objective, principal_service)



    #
    values: ObjectiveValues = objective_data_service.ask_values()

    # values.targets

    lineage_service.init_tenant_all_lineage_data(principal_service)

    #
    lineage_result:LineageResult = lineage_service.find_lineage_by_objective_target(target.uuid, objective.objectiveId, principal_service)


    chart = build_flowchat_by_lineage_result_and_values(lineage_result,values,language)
    md.append_text(chart)

    markdown_answer.content = md.contents()
    return markdown_answer






if __name__ == "__main__":
    stack = []

    # append() function to push
    # element in the stack
    stack.append('a')
    stack.append('b')
    stack.append('c')

    print('Initial stack')
    print(stack)

    # pop() function to pop
    # element from stack in
    # LIFO order
    print('\nElements popped from stack:')
    print(stack.pop())
    print(stack.pop())
    print(stack.pop())

    print('\nStack after elements are popped:')
    print(stack)
    # build_summary_markdown_for_business_target(None,"保険料単価")