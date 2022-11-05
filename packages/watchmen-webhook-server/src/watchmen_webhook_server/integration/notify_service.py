from abc import ABC, abstractmethod

from watchmen_auth import PrincipalService
from watchmen_meta.admin import UserService
from watchmen_meta.common import ask_snowflake_generator, ask_meta_storage
from watchmen_meta.webhook.notification_definition_service import NotificationDefinitionService
from watchmen_model.webhook.notification_defination import NotificationType, NotificationDefinition
from watchmen_model.webhook.subscription_event import SubscriptionEvent


def get_notification_definition_service(principal_service: PrincipalService) -> NotificationDefinitionService:
	return NotificationDefinitionService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_user_service(principal_service: PrincipalService) -> UserService:
	return UserService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


class NotifyService(ABC):

	@abstractmethod
	def support(self, notification_type: NotificationType):
		pass

	@abstractmethod
	async def notify(self, subscription_event: SubscriptionEvent,notification_definition: NotificationDefinition) -> bool:
		pass
