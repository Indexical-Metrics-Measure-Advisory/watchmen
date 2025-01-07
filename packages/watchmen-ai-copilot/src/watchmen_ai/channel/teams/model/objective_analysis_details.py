from pydantic import BaseModel


class ObjectiveAnalysisDetails(BaseModel):
    business_target: str = None
