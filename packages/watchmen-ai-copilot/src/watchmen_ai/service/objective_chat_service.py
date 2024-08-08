from typing import List

from watchmen_ai.lang.lang_service import get_message_by_lang
from watchmen_ai.llm.azure_model_loader import AzureModelLoader
from watchmen_ai.markdown.document import MarkdownDocument
from watchmen_ai.markdown.mermaid.flowchart import  flowchart
from watchmen_ai.model.chat_answer import OngoingCopilotAnswer, CopilotAnswerMarkdown, CopilotAnswerOption, \
    CopilotAnswerWithSession
from watchmen_ai.model.copilot_intent import CopilotIntent, CopilotTask
from watchmen_ai.model.index import ObjectiveIntent, ChatContext, ChatTaskContext
from watchmen_ai.router.utils import build_yes_no_item
from watchmen_ai.service.chat_service import ChatService
from watchmen_ai.intent.task_configuration import CopilotTaskConfiguration
from watchmen_ai.session.session_managment import get_session_manager, SessionManager
from watchmen_ai.task.confirm_message import ConfirmMessageGenerate
from watchmen_ai.task.date_parameter_recognition import DateParameterRecognition
from watchmen_ai.task.derived_objective_intent_recognition import ObjectiveIntentTaskRecognition
from watchmen_ai.utils.utils import generate_token
from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.data import get_objective_data_service, ObjectiveValues, ObjectiveTargetValues, \
    ObjectiveFactorValues
from watchmen_lineage.model.lineage import LineageResult, ObjectiveLineage, RelationshipLineage, ObjectiveTargetLineage, \
    IndicatorLineage, ObjectiveFactorLineage

from watchmen_lineage.service.lineage_service import get_lineage_service
from watchmen_meta.common import ask_snowflake_generator, ask_meta_storage
from watchmen_meta.system.ai_model_service import AIModelService
from watchmen_model.indicator import DerivedObjective, Objective, ObjectiveTarget
from watchmen_model.system.ai_model import AIModel

TIME_RANGE = "time_range"


def get_chat_service() -> ChatService:
    return ChatService()


def get_ai_service(principal_service: PrincipalService) -> AIModelService:
    return AIModelService(ask_meta_storage(), ask_snowflake_generator(), principal_service)





def find_target_name_list(derived_objective: DerivedObjective) -> List[str]:
    objective: Objective = derived_objective.definition
    targets: List[ObjectiveTarget] = objective.targets
    target_names = []
    for target in targets:
        target_names.append(target.name)
    return target_names



def call_date_range_intent(message:str ,ai_model:AIModel,language:str="en") -> str:
    action = DateParameterRecognition()
    return action.run(message, AzureModelLoader().get_llm_model())




def get_confirm_message(language, task_context):
    try:
        action = ConfirmMessageGenerate()
        message = action.run((task_context.history, language),
                             AzureModelLoader().get_llm_model())
        return message
    except Exception as e:
        print(e)
        return "confirm"


def chat_on_objective(session_id:str,token:str,message, principal_service,ai_model:AIModel,snowflakeGenerator,language:str="en") -> OngoingCopilotAnswer:
    session_manager:SessionManager = get_session_manager()
    chat_service = get_chat_service()
    chat_context :ChatContext = session_manager.get_session(session_id)
    token = chat_context.current_token
    if token:
        task_context:ChatTaskContext = session_manager.find_token_memory(session_id, token)
        if task_context.sub_tasks:
            key = task_context.sub_tasks.pop()
            task_context.history.append({"question": key, "answer": message})
            if key == TIME_RANGE:
                result = call_date_range_intent(message,ai_model,language)
                task_context.parameters[key] = result
            else:
                task_context.parameters[key] = message

            if task_context.sub_tasks:
                depend = task_context.sub_tasks[-1]
                answer = OngoingCopilotAnswer(sessionId=session_id, data=[get_message_by_lang(language,depend)])
                return answer
            else:

                answer = OngoingCopilotAnswer(sessionId=session_id, data=[get_message_by_lang(language, "confirm")])
                task_context.confirm = True
                options = build_yes_no_item(token,language)
                for option in options:
                    answer.data.append(option)
                # answer.data.append()
                return answer
        else:
            answer = CopilotAnswerWithSession(sessionId=session_id, data=[])

            intent_task: str = ObjectiveIntentTaskRecognition().run(message, AzureModelLoader().get_llm_model())
            task: CopilotTask = CopilotTaskConfiguration().load_task_by_name(intent_task, language)
            if task and task.depends:

                token = generate_token(snowflakeGenerator)
                task_context = ChatTaskContext(token=token, main_task=task, current_status="init", parameters={},
                                               )
                session_manager.add_token_memory(session_id, token, task_context)

                chat_context: ChatContext = session_manager.get_session(session_id)
                chat_context.current_token = token
                task_context.history.append({"question": task_context.main_task.description})
                depends: List[str] = task_context.main_task.depends
                task_context.sub_tasks = depends.copy()
                if task_context.sub_tasks:
                    key = task_context.sub_tasks[-1]
                    answer.data.append(get_message_by_lang(language, key))
                    return answer
                else:
                    # message = get_confirm_message(language, task_context)

                    answer = OngoingCopilotAnswer(sessionId=session_id,
                                                  data=[get_message_by_lang(language, "confirm")])
                    task_context.confirm = True
                    options = build_yes_no_item(token, language)
                    for option in options:
                        answer.data.append(option)
                    return answer

            else:
                if task.withConfirm:
                    if task.task_name == "exception_metrics":
                        answer.data.append(build_exception_markdown_for_business_target(None, "Profit", principal_service, language))
                        return answer

                else:
                    pass

    else:
        answer = CopilotAnswerWithSession(sessionId=session_id, data=[])

        intent_task: str = ObjectiveIntentTaskRecognition().run(message, AzureModelLoader().get_llm_model())
        task:CopilotTask = CopilotTaskConfiguration().load_task_by_name(intent_task,language)
        if task and task.depends:

            token = generate_token(snowflakeGenerator)
            task_context = ChatTaskContext(token=token, main_task=task, current_status="init", parameters={},
                                           )
            session_manager.add_token_memory(session_id, token, task_context)

            chat_context: ChatContext = session_manager.get_session(session_id)
            chat_context.current_token = token
            task_context.history.append({"question": task_context.main_task.description})
            depends: List[str] = task_context.main_task.depends
            task_context.sub_tasks = depends.copy()
            if task_context.sub_tasks:
                key = task_context.sub_tasks[-1]
                answer.data.append(get_message_by_lang(language, key))
                return answer
            else:
                # message = get_confirm_message(language, task_context)

                answer = OngoingCopilotAnswer(sessionId=session_id,
                                              data=[get_message_by_lang(language, "confirm")])
                task_context.confirm = True
                options = build_yes_no_item(token, language)
                for option in options:
                    answer.data.append(option)
                return answer

        else:
            if task.withConfirm:
                if task.task_name =="exception_metrics":
                    message =  build_exception_markdown_for_business_target(None,"Profit",principal_service,language)
                    answer.data.append(message)
                    return answer

            else:
                pass



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


def find_target(objective_lineage:ObjectiveLineage,target_name:str) -> ObjectiveTargetLineage:
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


# flowchart TB
#                 A[利益:297百万円]
#                 B[保険料:4355百万円]
#                 C[保険金:2475百万円]
#                 D[経費:1373百万円]
#                 E[運用収支:30百万円]
#                 F[責任準備金繰入:240百万円]
#                 G[保険料単価:50000円]
#                 H[入金率:95%]
#                 I[保有件数:91675件]
#                 J[請求単価:300000円]
#                 K[支払率:90%]
#                 L[請求件数:9168件]
#                 M[手数料:218百万円]
#                 N[物件費:435百万円]
#                 O[人件費:720百万円]
#                 P[利回り:1%]:::green
#                 Q[資産:3000百万円]
#                 R[純保険料:3484百万円]
#                 S[危険保険料:3266百万円]
#                 T[予定利息:22百万円]
#                 U[新規件数:1425件]
#                 V[前期保有:95000件]
#                 W[継続率:95%]:::red
#                 X[申込件数:1500件]
#                 Y[成立率:95%]
#                 Z[見積件数:218百万円]
#                 AB[コンバージョン:10%]
#                 AC[見込み件数:1500000件]
#                 AD[アクセス率:1.0%]:::red
#                 AE[プラットフォーム数 PF:3]
#                 AF[ユーザー数1PFあたり:500000件]
#                 AG[部門A:240百万円]
#                 AH[部門B:240百万円]
#                 AI[コールセンター:240百万円]
#                 AL[人数:40人]
#                 AM[平均:6百万円]
#                 AN[人数:40人]
#                 AO[平均:6百万円]
#                 AP[人数:40人]
#                 AQ[平均:6百万円]
#                 AR[受電数:5425件]
#                 AS[受電率:90%]
#                 AT[1人当たり:122件]
#                 AU[新契約:750件]
#                 AV[保全:4584件]
#                 AW[苦情:92件]:::red


def build_flowchat_by_exception_result_and_values(target,language) -> str:
    text = """

            flowchart TB
                A[Profit: 2.079 million USD]
                B[Premiums: 30.485 million USD]
                C[Insurance Payouts: 17.325 million USD]
                D[Expenses: 9.611 million USD]
                E[Investment Income: 0.21 million USD]
                F[Reserve for Claim : 1.68 million USD]
                G[Premium Unit Price: 350 USD]
                H[Collection Rate: 95%]
                I[Number of Policies: 91,675]
                J[Claim Unit Price: 2,100 USD]
                K[Payout Rate: 90%]
                L[Number of Claims: 9,168]
                M[Commission: 1.526 million USD]
                N[Material Costs: 3.045 million USD]
                O[Personnel Costs: 5.04 million USD]
                P[Yield: 1%]:::green
                Q[Assets: 21 million USD]
                R[Net Premium: 24.388 million USD]
                S[Risk Premium: 22.862 million USD]
                T[Expected Interest: 0.154 million USD]
                U[New Policies: 1,425]
                V[Policies at Beginning of Period: 95,000]
                W[Renewal Rate: 95%]:::red
                X[Number of Applications: 1,500]
                Y[Approval Rate: 95%]
                Z[Number of Quotes: 1.526 million USD]
                AB[Conversion: 10%]
                AC[Prospective Number: 1,500,000]
                AD[Access Rate: 1.0%]:::red
                AE[Number of Platforms: 3]
                AF[Users per Platform: 500,000]
                AG[Department A: 1.68 million USD]
                AH[Department B: 1.68 million USD]
                AI[Call Center: 1.68 million USD]
                AL[Number of People: 40]
                AM[Average: 0.042 million USD]
                AN[Number of People: 40]
                AO[Average: 0.042 million USD]
                AP[Number of People: 40]
                AQ[Average: 0.042 million USD]
                AR[Number of Calls: 5,425]
                AS[Call Response Rate: 90%]
                AT[Calls per Person: 122]
                AU[New Contracts: 750]
                AV[Policy Maintenance: 4,584]
                AW[Complaints: 92]:::red




                A --> B
                A --> C
                A --> D
                A --> E
                A --> F
                B --> G
                B --> H
                B --> I
                C --> J
                C --> K
                C --> L
                D --> M
                D --> N
                D --> O
                E --> P
                E --> Q
                F --> R
                F --> S
                F --> T
                I --> U
                I --> V
                I --> W
                U --> X
                U --> Y
                X --> Z
                X --> AB
                Z --> AC
                Z --> AD
                AC --> AE
                AC --> AF
                O --> AG
                O --> AH
                O --> AI
                AG --> AL
                AG --> AM
                AH --> AN
                AH --> AO
                AI --> AP
                AI --> AQ
                AP --> AR
                AP --> AS
                AP --> AT
                AR --> AU
                AR --> AV
                AR --> AW

            classDef red fill:#f96
            classDef green fill:#0f0
            classDef blue stroke:#00f
            """

    final = "```mermaid\n" + text + "\n"

    final += "```"
    return final



def build_flowchat_by_lineage_result_and_values(lineage_result:LineageResult,values:ObjectiveValues,target,language) -> str:
    if True:
        text = """
        
        flowchart TB
                A[Profit: 2.079 million USD]
                B[Policy Premium: 30.485 million USD]
                C[Insurance Payouts: 17.325 million USD]
                D[Expenses: 9.611 million USD]
                E[Investment Income: 0.21 million USD]
                F[Reserve for Claim: 1.68 million USD]
                G[Premium Unit Price: 350 USD]
                H[Collection Rate: 95%]
                I[Number of Policies: 91,675]
                J[Claim Unit Price: 2,100 USD]
                K[Payout Rate: 90%]
                L[Number of Claims: 9,168]
                M[Commission: 1.526 million USD]
                N[Material Costs: 3.045 million USD]
                O[Personnel Costs: 5.04 million USD]
                P[Yield: 1%]
                Q[Assets: 21 million USD]
                R[Net Premium: 24.388 million USD]
                S[Risk Premium: 22.862 million USD]
                T[Expected Interest: 0.154 million USD]
                U[New Policies: 1,425]
                V[Policies at Beginning of Period: 95,000]
                W[Renewal Rate: 95%]
                X[Number of Applications: 1,500]
                Y[Approval Rate: 95%]
                Z[Number of Quotes: 1.526 million USD]
                AB[Conversion: 10%]
                AC[Prospective Number: 1,500,000]
                AD[Access Rate: 1.0%]
                AE[Number of Platforms: 3]
                AF[Users per Platform: 500,000]
                AG[Department A: 1.68 million USD]
                AH[Department B: 1.68 million USD]
                AI[Call Center: 1.68 million USD]
                AL[Number of People: 40]
                AM[Average: 0.042 million USD]
                AN[Number of People: 40]
                AO[Average: 0.042 million USD]
                AP[Number of People: 40]
                AQ[Average: 0.042 million USD]
                AR[Number of Calls: 5,425]
                AS[Call Response Rate: 90%]
                AT[Calls per Person: 122]
                AU[New Contracts: 750]
                AV[Policy Maintenance: 4,584]
                AW[Complaints: 92]
            
        
         
            A --> B
            A --> C
            A --> D
            A --> E
            A --> F
            B --> G
            B --> H
            B --> I
            C --> J
            C --> K
            C --> L
            D --> M
            D --> N
            D --> O
            E --> P
            E --> Q
            F --> R
            F --> S
            F --> T
            I --> U
            I --> V
            I --> W
            U --> X
            U --> Y
            X --> Z
            X --> AB
            Z --> AC
            Z --> AD
            AC --> AE
            AC --> AF
            O --> AG
            O --> AH
            O --> AI
            AG --> AL
            AG --> AM
            AH --> AN
            AH --> AO
            AI --> AP
            AI --> AQ
            AP --> AR
            AP --> AS
            AP --> AT
            AR --> AU
            AR --> AV
            AR --> AW
            
        classDef red fill:#f96
        classDef green fill:#0f0
        classDef blue stroke:#00f
        """

        final = "```mermaid\n" + text + "\n"

        final += "```"
        return final
    else:
        objective : ObjectiveLineage= lineage_result.objectives[0]
        print("object:",objective.json())
        print("target,",target)
        target_lineage = find_target(objective,target.name)
        uuid = target_lineage.uuid

        print(lineage_result.json())

        print("values",values.json())
        target_value = find_values_by_id(values,uuid)
        print("target_value",target_value)

        flowchart.set_layout(flowchart.layout_topToBottom)
        target_cid_ = target_lineage.cid_
        n1 = flowchart.add_node(build_node_name(target.name,target_value.currentValue,target_value.previousValue,target_value.chainValue,language), shape=1)
        a = flowchart.add_arrow(type=flowchart.arrowType_thickArrow)



        relationship:RelationshipLineage = find_relationship_lineage_by_objective_id(lineage_result,target_cid_)


        node_list = []
        for from_relation in relationship.from_:
            cid = from_relation.cid_
            if cid.startswith("OBJECTIVE-INDICATOR"):
                indicator:IndicatorLineage = find_indicator_by_cid(objective,cid)

                node = None
                value = find_values_by_name(values,indicator.name)
                if value:
                    n = flowchart.add_node(build_node_name(indicator.name,value.currentValue,value.previousValue,value.chainValue,language))
                    flowchart.link(n1, n, a)
                    node = n
                else:
                    factor_value = find_factor_value_by_id(values,indicator.uuid)
                    if factor_value:
                        n = flowchart.add_node(build_node_name(indicator.name,factor_value.currentValue,factor_value.previousValue,factor_value.chainValue,language))
                        flowchart.link(n1, n, a)
                        node = n
                    else:
                        n = flowchart.add_node(indicator.name)
                        flowchart.link(n1, n, a)
                        node = n
                sub_target_lineage = find_target(objective, indicator.name)
                if sub_target_lineage:
                    sub_relationships: RelationshipLineage = find_relationship_lineage_by_objective_id(lineage_result,
                                                                                                       sub_target_lineage.cid_)

                    for sub_from_relation in sub_relationships.from_:
                        cid = sub_from_relation.cid_
                        if cid.startswith("OBJECTIVE-INDICATOR"):
                            indicator: IndicatorLineage = find_indicator_by_cid(objective, cid)
                            sub_value = find_values_by_name(values, indicator.name)
                            if sub_value:
                                n = flowchart.add_node(
                                    build_node_name(indicator.name, sub_value.currentValue, sub_value.previousValue,
                                                    sub_value.chainValue, language))
                                flowchart.link(node, n, a)
                                # node_list.append(n)
                            else:
                                factor_value = find_factor_value_by_id(values, indicator.uuid)
                                if factor_value:
                                    n = flowchart.add_node(build_node_name(indicator.name, factor_value.currentValue,
                                                                           factor_value.previousValue,
                                                                           factor_value.chainValue,
                                                                           language))
                                    flowchart.link(node, n, a)
                                else:
                                    n = flowchart.add_node(indicator.name)
                                    flowchart.link(node, n, a)

        # flowchart.link(n1, node_list, a)

        text = flowchart.evaluate()
        print(text)
        return text





def build_exception_markdown_for_business_target(objective:Objective,target:str,principal_service,language:str="en") -> CopilotAnswerMarkdown:
    markdown_answer = CopilotAnswerMarkdown()
    md = MarkdownDocument()
    md.append_heading(get_message_by_lang(language, "markdown_summary") + " {}".format(target), 2)
    chart = build_flowchat_by_exception_result_and_values(target, language)
    md.append_text(chart)

    markdown_answer.content = md.contents()

    return markdown_answer



def build_summary_markdown_for_business_target(objective:Objective,target:str,principal_service,language:str="en") -> CopilotAnswerMarkdown:
    lineage_service = get_lineage_service()
    markdown_answer = CopilotAnswerMarkdown()
    md = MarkdownDocument()
    md.append_heading(get_message_by_lang(language,"markdown_summary")+" {}".format(target),2)
    print(target)

    print(objective.json())
    target:ObjectiveTarget = find_target_by_name(objective,target)


    objective_data_service = get_objective_data_service(objective, principal_service)


    #
    values: ObjectiveValues = objective_data_service.ask_values()

    # values.targets

    lineage_service.init_tenant_all_lineage_data(principal_service)

    #
    lineage_result:LineageResult = lineage_service.find_lineage_by_objective(objective.objectiveId, principal_service)


    chart = build_flowchat_by_lineage_result_and_values(lineage_result,values,target,language)
    md.append_text(chart)

    markdown_answer.content = md.contents()



    return markdown_answer



