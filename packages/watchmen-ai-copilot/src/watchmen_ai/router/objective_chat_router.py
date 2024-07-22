from pydantic import BaseModel
from typing import Optional

from fastapi import APIRouter, Depends

from watchmen_ai.model.chat_answer import CopilotAnswerWithSession, CopilotAnswerOption
from watchmen_ai.model.index import ChatContext
from watchmen_ai.session.session_managment import SessionManager
from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.meta import DerivedObjectiveService,ObjectiveService
from watchmen_indicator_surface.util import trans
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import UserRole
from watchmen_model.indicator import DerivedObjective
from watchmen_rest import get_console_principal

router = APIRouter()


def get_derived_objective_service(principal_service: PrincipalService) -> DerivedObjectiveService:
    return DerivedObjectiveService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_session_manager() -> SessionManager:
    return SessionManager()


def get_objective_service(principal_service: PrincipalService)->ObjectiveService:
    return ObjectiveService(ask_meta_storage(), ask_snowflake_generator(),principal_service)


class DerivedObjectiveChatReq(BaseModel):
    derivedObjectiveId: str
    sessionId: str
    recommendation: bool


def generate_greeting_for_create_new_session(sessionId: str,data: list)->CopilotAnswerWithSession:
    answer = CopilotAnswerWithSession(sessionId=sessionId, data=[])
    answer.data.append("I can also help you with the following:")

    option_1 = CopilotAnswerOption(text="Clearly present metrics", action="Clearly", vertical=True)
    option_2 = CopilotAnswerOption(text="Offer actionable guidance", action="guidance")

    answer.data.append(option_1)
    answer.data.append(option_2)
    return answer


@router.post("/derived-objective/new-session", tags=[UserRole.CONSOLE], response_model=CopilotAnswerWithSession)
def chat_new_session_for_objective(sessionId: str, derivedObjectiveId: str,
                                   recommendation: bool, principal_service: PrincipalService = Depends(
            get_console_principal)) -> CopilotAnswerWithSession:


    session_manager:SessionManager = get_session_manager()

    derived_objective_service = get_derived_objective_service(principal_service)

    def action() -> Optional[DerivedObjective]:
        return derived_objective_service.find_by_id(derivedObjectiveId)

    derived_objective = trans(derived_objective_service,action)

    session_manager.create_session(sessionId, ChatContext(context_type="objective",
                                                          memory={"derived_objective": derived_objective}))


    # generate recommendation intent base on  actions and target metrics
    # convert to answer 





    answer = CopilotAnswerWithSession(sessionId=sessionId, data=[])
    answer.data.append("I can also help you with the following:")

    option_1 = CopilotAnswerOption(text="Clearly present metrics", action="Clearly",vertical=True)
    option_2 = CopilotAnswerOption(text="Offer actionable guidance", action="guidance" )


    answer.data.append(option_1)
    answer.data.append(option_2)
    return answer
