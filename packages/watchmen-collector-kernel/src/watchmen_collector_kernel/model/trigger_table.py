from watchmen_model.common import TenantBasedTuple


class TriggerTable(TenantBasedTuple):
	tableTriggerId: int
	tableName: str
	dataCount: int
	modelName: str
	isExtracted: bool = False
	modelTriggerId: int
	moduleTriggerId: int
	eventTriggerId: int
