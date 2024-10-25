from enum import Enum
from typing import Optional

from pydantic import BaseModel

from watchmen_model.common import OptimisticLock, TenantBasedTuple


class WatchmenNode(TenantBasedTuple, OptimisticLock, BaseModel):
    nodeId: str = None
    nodeLabel: str = None
    documentId: str = None
    nodeName: str = None
    nodeProperties: dict = None


class WatchmenEdge(TenantBasedTuple, OptimisticLock, BaseModel):
    edgeId: str = None
    sourceNodeID: str = None
    targetNodeID: str = None
    documentId: str = None
    edgeLabel: str = None
    edgeName: str = None
    edgeProperties: dict = None


class WatchmenPropertyType(str, Enum):
    STRING = "STRING"
    NUMBER = "NUMBER"
    BOOLEAN = "BOOLEAN"
    DATE = "DATE"


class WatchmenProperty(TenantBasedTuple, OptimisticLock, BaseModel):
    propertyId: str = None
    nodeID: Optional[str] = None
    edgeID: Optional[str] = None
    documentId: str = None
    propertyName: str = None
    propertyValue: str = None
    propertyType: WatchmenPropertyType = WatchmenPropertyType.STRING
