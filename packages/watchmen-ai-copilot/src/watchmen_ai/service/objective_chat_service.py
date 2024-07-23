from typing import List

from watchmen_ai.model.chat_answer import OngoingCopilotAnswer
from watchmen_ai.model.copilot_intent import CopilotIntent
from watchmen_ai.model.index import ObjectiveIntent
from watchmen_ai.service.chat_service import ChatService
from watchmen_ai.session.session_managment import get_session_manager, SessionManager
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







def chat_on_objective(session_id:str,token:str,message, principal_service,ai_model:AIModel) -> OngoingCopilotAnswer:
    session_manager:SessionManager = get_session_manager()
    chat_service = get_chat_service()

    if token:
        task_context = session_manager.find_token_memory(session_id, token)


    else:
        intent: ObjectiveIntent = chat_service.find_intent(message)
        answer = OngoingCopilotAnswer(sessionId=session_id, data=[intent.intentDescription])
        return answer
