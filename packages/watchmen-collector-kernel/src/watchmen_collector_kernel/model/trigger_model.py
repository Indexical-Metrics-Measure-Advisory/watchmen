from watchmen_model.common import TenantBasedTuple


class TriggerModel(TenantBasedTuple):
	modelTriggerId: int
	modelName: str
	isFinished: bool = False
	eventTriggerId: int
