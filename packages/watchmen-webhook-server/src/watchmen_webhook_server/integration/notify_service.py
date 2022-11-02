from abc import ABC, abstractmethod


from watchmen_model.webhook.notification_defination import NotificationType, NotificationDefinition
from watchmen_model.webhook.subscription_event import SubscriptionEvent


class NotifyService(ABC):

	@abstractmethod
	def support(self, notification_type: NotificationType):
		pass

	@abstractmethod
	async def notify(self, subscription_event: SubscriptionEvent,notification_definition: NotificationDefinition) -> bool:
		pass
