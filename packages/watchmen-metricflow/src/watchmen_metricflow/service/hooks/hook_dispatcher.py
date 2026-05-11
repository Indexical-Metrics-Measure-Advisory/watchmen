from logging import getLogger
from typing import List, Optional, Dict, Any

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

    async def execute_actions(self, rule: GlobalAlertRule, message: str, actions: List[AlertAction],
                           condition_results: list = None,
                           report_data: List[Dict[str, Any]] = None,
                           share_link: str = None) -> bool:
        all_success = True
        for action in actions:
            plugin = self._find_plugin(action)
            if plugin is None:
                logger.warning('no plugin matched for alert action, action_type=%s, action_name=%s',
                               action.type, action.name)
                all_success = False
                continue
            try:
                try:
                    success = await plugin.execute(
                        action, rule, message, condition_results, report_data, share_link
                    )
                except TypeError:
                    # Backward compatibility for plugins still using old signature:
                    # execute(action, rule, message)
                    logger.warning(
                        'plugin execute signature mismatch, fallback to legacy signature, '
                        'plugin=%s, action_type=%s, action_name=%s',
                        plugin.__class__.__name__, action.type, action.name
                    )
                    success = await plugin.execute(action, rule, message)
                if not success:
                    all_success = False
            except Exception:
                logger.exception('failed to execute alert hook plugin')
                all_success = False
        return all_success
