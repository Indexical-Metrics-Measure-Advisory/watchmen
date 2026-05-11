from abc import ABC, abstractmethod
from typing import List, Dict, Any

from watchmen_metricflow.model.alert_rule import AlertAction, GlobalAlertRule


class AlertHookPlugin(ABC):
    @abstractmethod
    def support(self, action_type: str) -> bool:
        pass

    @abstractmethod
    async def execute(self, action: AlertAction, rule: GlobalAlertRule, message: str,
                     condition_results: list = None,
                     report_data: List[Dict[str, Any]] = None,
                     share_link: str = None) -> bool:
        pass
