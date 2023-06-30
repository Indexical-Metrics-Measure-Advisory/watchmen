from typing import Dict

from watchmen_model.common import TenantBasedTuple


class ChangeDataRecord(TenantBasedTuple):
	changeRecordId: int
	modelName: str
	tableName: str
	dataId: Dict
	rootTableName: str
	rootDataId: Dict
	isMerged: bool
	status: int
	result: Dict
	tableTriggerId: int
	modelTriggerId: int
	moduleTriggerId: int
	eventTriggerId: int


