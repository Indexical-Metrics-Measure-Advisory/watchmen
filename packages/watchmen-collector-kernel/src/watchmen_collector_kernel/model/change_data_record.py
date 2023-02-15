from watchmen_model.common import TenantBasedTuple


class ChangeDataRecord(TenantBasedTuple):
	changeRecordId: str
	modelName: str
	tableName: str
	dataId: str
	rootTableName: str
	rootDataId: str
	isMerged: bool
	result: str
	tableTriggerId: str
	modelTriggerId: str
	eventTriggerId: str


