from typing import List, Optional

from pydantic import BaseModel

from watchmen_model.admin import Topic, Factor


class AskAIBase(BaseModel):
    tenantId: str


class AskAIGenerateFactors(AskAIBase):
    topic: Topic
    limit: int


class AskAIGenerateFactorsResponse(AskAIBase):
    suggestionFactors: List[Factor] = []
    response: Optional[str] = None