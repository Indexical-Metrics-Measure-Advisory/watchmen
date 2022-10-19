from typing import List

from watchmen_model.webhook.notification_defination import NotificationType, NotificationDefinition
from watchmen_model.webhook.subscription_event import SubscriptionEvent
from watchmen_webhook_server import NotifyService
from wetchmen_webhook.api.webhook_service import load_notifications_by_user_id


class EmailService(NotifyService):

	def support(self, notification_type: NotificationType):
		return NotificationType.EMAIL == notification_type

	def notify(self, subscription_event: SubscriptionEvent) -> bool:
		notification_definition: List[NotificationDefinition] = load_notifications_by_user_id(subscription_event.userId)
		pass





