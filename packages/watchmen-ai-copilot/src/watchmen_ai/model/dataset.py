from pydantic import BaseModel


class DocumentSegment(BaseModel):
    pass


class KnowledgeDataset(BaseModel):
    syncToGraph: bool = False
    pass
