from typing import Dict, Optional

from watchmen_model.common import TenantBasedTuple


class ChangeDataRecord(TenantBasedTuple):
	changeRecordId: int
	modelName: str
	tableName: str
	dataId: Dict
	rootTableName: str
	rootDataId: Dict
	isMerged: bool
	result: str
	tableTriggerId: int
	modelTriggerId: int
	eventTriggerId: int


