from typing import List

from watchmen_model.admin import UserRole
from watchmen_model.common import UserId
from watchmen_model.common.tuple_ids import NotificationDefinitionId, EventDefinitionId
from watchmen_model.webhook.event_defination import EventDefinition
from watchmen_model.webhook.notification_defination import NotificationDefinition
from watchmen_model.webhook.subscription_event import SubscriptionEvent





def load_notifications_by_user_id(userId: UserId) -> List[NotificationDefinition]:
	pass


def load_notification_by_id(notification_id: NotificationDefinitionId) -> NotificationDefinition:
	pass


def load_event_definition_by_id(event_definition_id: EventDefinitionId) -> EventDefinition:
	pass


def load_events_by_user_role(userRole: UserRole) -> List[EventDefinition]:
	pass


def save_notification_definition(notification_definition: NotificationDefinition) -> NotificationDefinition:
	pass


def save_event_definition(event_definition: EventDefinition) -> EventDefinition:





	pass


def save_event_definitions(event_definition_list: List[EventDefinition]) -> list[EventDefinition]:
	return [save_event_definition(event_definition) for event_definition in event_definition_list]




def save_subscription_event(subscription_event: SubscriptionEvent) -> SubscriptionEvent:
	pass
