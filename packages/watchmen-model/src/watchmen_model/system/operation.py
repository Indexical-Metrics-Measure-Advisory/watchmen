from typing import Dict

from watchmen_model.common import TenantBasedTuple


class Operation(TenantBasedTuple):
	recordId: str
	tupleType: str
	tupleId: str
	content: Dict
	versionNum: str
