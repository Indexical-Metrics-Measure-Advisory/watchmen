from typing import List
from logging import getLogger
from watchmen_webhook_server.action.definition import AlertAction
from watchmen_webhook_server.action.executor.abs_executor import ActionExecutor
from watchmen_webhook_server.action.executor.email_executor import EmailExecutor
from watchmen_webhook_server.action.executor.feishu_executor import FeishuExecutor
from watchmen_model.webhook.subscription_event import SubscriptionEvent

logger = getLogger(__name__)

class ActionService:
    def __init__(self):
        self.executors: List[ActionExecutor] = [
            EmailExecutor(),
            FeishuExecutor()
        ]

    async def notify(self, action: AlertAction, event: SubscriptionEvent) -> bool:
        for executor in self.executors:
            if executor.support(action.type):
                try:
                    return await executor.execute(action, event)
                except Exception as e:
                    logger.error(f"Error executing action {action.type}: {e}", exc_info=True)
                    return False
        
        logger.warning(f"No executor found for action type: {action.type}")
        return False
