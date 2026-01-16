from abc import ABC, abstractmethod
from watchmen_webhook_server.action.definition import AlertAction
from watchmen_model.webhook.subscription_event import SubscriptionEvent

class ActionExecutor(ABC):
    @abstractmethod
    def support(self, action_type: str) -> bool:
        pass

    @abstractmethod
    async def execute(self, action: AlertAction, event: SubscriptionEvent) -> bool:
        pass
