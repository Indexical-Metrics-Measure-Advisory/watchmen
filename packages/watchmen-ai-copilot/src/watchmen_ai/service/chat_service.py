from watchmen_ai.model.copilot_intent import CopilotIntent
from watchmen_ai.model.index import ChatContext, ObjectiveIntent


class ChatService:

    def find_intent(self, message: str) -> CopilotIntent:
        return CopilotIntent(intent=ObjectiveIntent.ask_data_for_business_target, tasks=["tasks"],
                             intentDescription="intentDescription")

    def find_chat_context(self, sessionId: str) -> ChatContext:
        return ChatContext(sessionId="sessionId", context_type="objective", memory={})
