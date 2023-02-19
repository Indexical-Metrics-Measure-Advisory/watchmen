from watchmen_model.common import TenantBasedTuple


class ChangeDataRecord(TenantBasedTuple):
	changeRecordId: int
	modelName: str
	tableName: str
	dataId: str
	rootTableName: str
	rootDataId: str
	isMerged: bool
	result: str
	tableTriggerId: int
	modelTriggerId: int
	eventTriggerId: int


