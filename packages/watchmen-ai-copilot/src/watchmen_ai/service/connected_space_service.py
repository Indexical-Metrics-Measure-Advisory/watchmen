from typing import List

from watchmen_ai.intent.task_configuration import CopilotTaskConfiguration
from watchmen_ai.lang.lang_service import get_message_by_lang
from watchmen_ai.llm.azure_model_loader import AzureModelLoader
from watchmen_ai.markdown.document import MarkdownDocument
from watchmen_ai.model.chat_answer import OngoingCopilotAnswer, CopilotAnswerWithSession, CopilotAnswerMarkdown
from watchmen_ai.model.copilot_intent import CopilotTask
from watchmen_ai.model.index import ChatContext, ChatTaskContext
from watchmen_ai.router.utils import build_yes_no_item
from watchmen_ai.service.objective_chat_service import get_chat_service, TIME_RANGE, call_date_range_intent, \
    build_exception_markdown_for_business_target
from watchmen_ai.session.session_managment import get_session_manager, SessionManager
from watchmen_ai.task.connect_space_task_recognition import ConnectedSpaceIntentTaskRecognition
from watchmen_ai.utils.utils import generate_token
from watchmen_auth import PrincipalService
from watchmen_indicator_surface.util import trans
from watchmen_inquiry_kernel.helper.subject_helper import add_column_type_to_subjects
from watchmen_inquiry_kernel.storage.subject_storage import get_connected_space_service
from watchmen_meta.console import SubjectService, ConnectedSpaceService
from watchmen_model.console import Subject, ConnectedSpace
from watchmen_model.console.subject_ext import SubjectWithFactorType
from watchmen_model.system.ai_model import AIModel
from watchmen_utilities import ArrayHelper


def get_subject_service(connected_space_service: ConnectedSpaceService) -> SubjectService:
    return SubjectService(
        connected_space_service.storage, connected_space_service.snowflakeGenerator,
        connected_space_service.principalService)


def build_graph_for_connected_space(target, language) -> str:
    text = """

           graph LR
      Customer[Customer]
      Policy[Policy]
      Quotation[Quotation]
      Agent[Agent]
      Channel[Channel]
      Agency[Agency]
        
    
      Customer -->|has policies| Policy
      Policy -->|linked to| Quotation
      Policy -->|sold by| Agent
      Agent -->|operates in| Channel
      Agent -->|works for| Agency
      Channel -->|used by| Agency
            """

    final = "```mermaid\n" + text + "\n"

    final += "```"
    return final


def build_connected_space_markdown(connect_space, target: str, principal_service,
                                   language: str = "en") -> CopilotAnswerMarkdown:
    markdown_answer = CopilotAnswerMarkdown()
    md = MarkdownDocument()
    md.append_heading(get_message_by_lang(language, "markdown_summary") + " {}".format(target), 2)
    chart = build_graph_for_connected_space(target, language)
    md.append_text(chart)

    markdown_answer.content = md.contents()

    return markdown_answer


def chat_on_connected_space(session_id: str, token: str, message, principal_service, ai_model: AIModel,
                            snowflakeGenerator, language: str = "en") -> OngoingCopilotAnswer:
    session_manager: SessionManager = get_session_manager()
    chat_service = get_chat_service()
    chat_context: ChatContext = session_manager.get_session(session_id)
    token = chat_context.current_token
    if token:
        task_context: ChatTaskContext = session_manager.find_token_memory(session_id, token)
        if task_context.sub_tasks:
            key = task_context.sub_tasks.pop()
            task_context.history.append({"question": key, "answer": message})
            if key == TIME_RANGE:
                result = call_date_range_intent(message, ai_model, language)
                task_context.parameters[key] = result
            else:
                task_context.parameters[key] = message

            if task_context.sub_tasks:
                depend = task_context.sub_tasks[-1]
                answer = OngoingCopilotAnswer(sessionId=session_id, data=[get_message_by_lang(language, depend)])
                return answer
            else:

                answer = OngoingCopilotAnswer(sessionId=session_id, data=[get_message_by_lang(language, "confirm")])
                task_context.confirm = True
                options = build_yes_no_item(token, language)
                for option in options:
                    answer.data.append(option)
                # answer.data.append()
                return answer
        else:
            answer = CopilotAnswerWithSession(sessionId=session_id, data=[])

            intent_task: str = ConnectedSpaceIntentTaskRecognition().run(message, AzureModelLoader().get_llm_model())
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
                if task.withOutConfirm:
                    if task.task_name == "find_data_mart":
                        answer.data.append(
                            build_connected_space_markdown(None, "sales_performance", principal_service, language))
                        return answer
                    elif task.task_name == "overview_connected_space":
                        answer.data.append(
                            build_connected_space_markdown(None, "sales_performance", principal_service, language))
                        return answer

                else:
                    pass

    else:
        answer = CopilotAnswerWithSession(sessionId=session_id, data=[])

        intent_task: str = ConnectedSpaceIntentTaskRecognition().run(message, AzureModelLoader().get_llm_model())
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
            if task.withOutConfirm:
                if task.task_name == "find_data_mart":
                    message = build_exception_markdown_for_business_target(None, "Sales_performance", principal_service,
                                                                           language)
                    answer.data.append(message)
                    return answer
                elif task.task_name == "overview_connected_space":
                    answer.data.append(
                        build_connected_space_markdown(None, "Sales_performance", principal_service, language))
                    return answer

            else:
                pass

        return answer


async def find_all_subject(principal_service: PrincipalService) -> List[SubjectWithFactorType]:
    connected_space_service = get_connected_space_service(principal_service)

    def action() -> List[Subject]:
        connected_spaces: List[ConnectedSpace] = connected_space_service.find_templates_by_user_id(
            principal_service.get_user_id(), principal_service.get_tenant_id())
        subject_service: SubjectService = get_subject_service(connected_space_service)
        return ArrayHelper(connected_spaces) \
            .map(lambda x: subject_service.find_by_connect_id(x.connectId)) \
            .flatten() \
            .to_list()

    subjects = trans(connected_space_service, action)
    return add_column_type_to_subjects(subjects, principal_service)
