from .email_hook_plugin import EmailHookPlugin
from .hook_dispatcher import AlertHookDispatcher
from .notification_hook_plugin import NotificationHookPlugin


def build_alert_hook_dispatcher() -> AlertHookDispatcher:
    return AlertHookDispatcher(plugins=[NotificationHookPlugin(), EmailHookPlugin()])
