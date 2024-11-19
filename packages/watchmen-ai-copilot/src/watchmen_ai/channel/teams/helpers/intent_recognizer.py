from watchmen_ai.channel.common.chat_intent import MainIntent


class IntentRecognizer:

    def recognize_intent(self, text: str) -> MainIntent:
        return MainIntent.analysis_objective

    def _find_intent_in_vectordb(self, text: str):
        pass

    def _ask_llm_model(self, text: str):
        pass
