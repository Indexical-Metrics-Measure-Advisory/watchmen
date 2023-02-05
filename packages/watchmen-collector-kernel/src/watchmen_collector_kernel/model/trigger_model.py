from watchmen_model.common import TenantBasedTuple


class TriggerModel(TenantBasedTuple):
	modelTriggerId: str
	modelName: str
	isFinished: bool = False
	eventTriggerId: str
