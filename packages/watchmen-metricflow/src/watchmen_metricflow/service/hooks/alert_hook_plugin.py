from abc import ABC, abstractmethod

from watchmen_metricflow.model.alert_rule import AlertAction, GlobalAlertRule


class AlertHookPlugin(ABC):
    @abstractmethod
    def support(self, action_type: str) -> bool:
        pass

    @abstractmethod
    async def execute(self, action: AlertAction, rule: GlobalAlertRule, message: str) -> bool:
        pass
