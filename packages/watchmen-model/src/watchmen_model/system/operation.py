from enum import Enum
from typing import Dict

from watchmen_model.common import TenantBasedTuple


class Operation(TenantBasedTuple):
	recordId: str
	operationType: str
	tupleKey: str
	tupleType: str
	tupleId: str
	content: Dict
	versionNum: str


class OperationType(str, Enum):
	CREATE = "create"
	UPDATE = "update"
	DELETE = "delete"
