from abc import ABC, abstractmethod


from watchmen_model.webhook.notification_defination import NotificationType
from watchmen_model.webhook.subscription_event import SubscriptionEvent


class NotifyService(ABC):

	@abstractmethod
	def support(self, notification_type: NotificationType):
		pass

	@abstractmethod
	def notify(self, subscription_event: SubscriptionEvent) -> bool:
		pass
