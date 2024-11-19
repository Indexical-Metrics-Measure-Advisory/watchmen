from pydantic import BaseModel


class Feedback(BaseModel):
    user_feedback: str = None
    user_behavior: str = None
    error_log: str = None
    user_id: str = None
