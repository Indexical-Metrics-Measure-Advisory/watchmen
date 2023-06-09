from watchmen_model.common import TenantBasedTuple


class TriggerModule(TenantBasedTuple):
	moduleTriggerId: int
	moduleName: str
	isFinished: bool = False
	priority: int
	eventTriggerId: int
