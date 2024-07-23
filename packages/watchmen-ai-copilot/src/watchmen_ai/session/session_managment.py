from watchmen_ai.model.index import ChatContext, ChatTaskContext


class SessionManager:
    def __init__(self):
        self.sessions = {}

    def create_session(self,  session_id,chat_context:ChatContext):
        self.sessions[session_id] = chat_context

    def delete_session(self, session_id):
        self.sessions.pop(session_id, None)


    def find_memeory(self,session_id):
        return self.sessions[session_id].memory

    def add_token_memory(self,session_id:str,token:str,data:ChatTaskContext):
        self.sessions[session_id].memory[token] = data


    def find_token_memory(self,session_id:str,token:str)->ChatTaskContext:
        return self.sessions[session_id].memory[token]


session_manager = SessionManager()
def get_session_manager()->SessionManager:
    return session_manager