from watchmen_model.common import TenantBasedTuple


class ChangeDataRecord(TenantBasedTuple):
	changeRecordId: str
	modelName: str
	tableName: str
	dataId: int
	rootTableName: str
	rootDataId: str
	isMerged: bool
	tableTriggerId: str
	modelTriggerId: str
	eventTriggerId: str


