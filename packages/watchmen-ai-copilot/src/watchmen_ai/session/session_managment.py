from watchmen_ai.model.index import ChatContext


class SessionManager:
    def __init__(self):
        self.sessions = {}

    def create_session(self,  session_id,chat_context:ChatContext):
        self.sessions[session_id] = chat_context

    def delete_session(self, session_id):
        self.sessions.pop(session_id, None)


    def find_memeory(self,session_id):
        return self.sessions[session_id].memory