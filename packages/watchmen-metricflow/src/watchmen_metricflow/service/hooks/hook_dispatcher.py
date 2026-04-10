from logging import getLogger
from typing import List, Optional

from watchmen_metricflow.model.alert_rule import AlertAction, GlobalAlertRule

from .alert_hook_plugin import AlertHookPlugin

logger = getLogger(__name__)


class AlertHookDispatcher:
    def __init__(self, plugins: List[AlertHookPlugin]):
        self.plugins = plugins

    def _find_plugin(self, action: AlertAction) -> Optional[AlertHookPlugin]:
        action_type = action.actionType.get('category').lower()
        for plugin in self.plugins:
            if plugin.support(action_type):
                return plugin
        return None

    async def execute_actions(self, rule: GlobalAlertRule, message: str, actions: List[AlertAction]) -> None:
        for action in actions:
            plugin = self._find_plugin(action)
            if plugin is None:
                continue
            try:
                await plugin.execute(action, rule, message)
            except Exception:
                logger.exception('failed to execute alert hook plugin')
