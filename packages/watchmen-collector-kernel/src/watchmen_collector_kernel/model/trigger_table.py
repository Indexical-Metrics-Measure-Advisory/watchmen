from watchmen_model.common import TenantBasedTuple


class TriggerTable(TenantBasedTuple):
	tableTriggerId: str
	tableName: str
	dataCount: int
	modelName: str
	isExtracted: bool = False
	isFinished: bool = False
	modelTriggerId: str
	eventTriggerId: str