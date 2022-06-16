from typing import Dict

from pydantic import BaseModel

from watchmen_model.common import TenantBasedTuple
from watchmen_model.common.tuple_ids import NotebookId


class Notebook(TenantBasedTuple, BaseModel):
    notebookId:NotebookId = None
    name: str = None
    storageType: str = None
    storageLocation: str = None
    environment: Dict = {}
    dependencies: Dict = {}
