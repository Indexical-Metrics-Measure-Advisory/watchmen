from logging import getLogger
from typing import List, Optional

from watchmen_metricflow.model.alert_rule import AlertAction, GlobalAlertRule

from .alert_hook_plugin import AlertHookPlugin

logger = getLogger(__name__)


class AlertHookDispatcher:
    def __init__(self, plugins: List[AlertHookPlugin]):
        self.plugins = plugins

    def _find_plugin(self, action: AlertAction) -> Optional[AlertHookPlugin]:
        action_type = None
        if action.actionType is not None:
            action_type = action.actionType.get('category') or action.actionType.get('code')
        if action_type is None:
            action_type = action.type
        if action_type is None:
            return None
        normalized = str(action_type).lower()
        for plugin in self.plugins:
            if plugin.support(normalized):
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
