from watchmen_metricflow.model.alert_rule import AlertAction, GlobalAlertRule

from .alert_hook_plugin import AlertHookPlugin
from .email_hook_plugin import EmailHookPlugin


class NotificationHookPlugin(AlertHookPlugin):
    def __init__(self):
        self.email_hook = EmailHookPlugin()

    def support(self, action_type: str) -> bool:
        return False

    async def execute(self, action: AlertAction, rule: GlobalAlertRule, message: str) -> bool:
        params = action.parameters or {}
        channel = (params.get('channel') or 'email').lower()
        if channel == 'email':
            return await self.email_hook.execute(action, rule, message)
        return False
