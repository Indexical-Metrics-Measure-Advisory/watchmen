from typing import List, Optional

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.webhook.event_definition_service import EventDefinitionService
from watchmen_meta.webhook.notification_definition_service import NotificationDefinitionService
from watchmen_meta.webhook.subscription_event_lock_service import SubscriptionEventLockService
from watchmen_meta.webhook.subscription_event_service import SubscriptionEventService
from watchmen_model.admin import UserRole
from watchmen_model.common import EventDefinitionId, NotificationDefinitionId, UserId
from watchmen_model.webhook.event_defination import EventDefinition
from watchmen_model.webhook.notification_defination import NotificationDefinition
from watchmen_model.webhook.subscription_event import SubscriptionEvent
from watchmen_rest import get_admin_principal, get_any_principal
from watchmen_rest.util import raise_403, raise_404, validate_tenant_id
from watchmen_rest_doll.util import trans, trans_readonly

router = APIRouter()


def get_event_definition_service(principal_service: PrincipalService) -> EventDefinitionService:
	return EventDefinitionService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_notification_definition_service(principal_service: PrincipalService) -> NotificationDefinitionService:
	return NotificationDefinitionService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_subscription_event_service(principal_service: PrincipalService) -> SubscriptionEventService:
	return SubscriptionEventService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_subscription_event_lock_service(principal_service: PrincipalService) -> SubscriptionEventLockService:
	return SubscriptionEventLockService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.get('/notification/user', tags=[UserRole.ADMIN, UserRole.CONSOLE], response_model=List[NotificationDefinition])
def load_notifications_by_user_id(user_id: Optional[UserId] = None,
                                  principal_service: PrincipalService = Depends(get_any_principal)) -> List[
	NotificationDefinition]:
	notification_definition_service: NotificationDefinitionService = get_notification_definition_service(
		principal_service)

	def action() -> List[NotificationDefinition]:
		notification_definition_list: List[NotificationDefinition] = notification_definition_service.find_by_user_id(
			user_id, principal_service.tenantId)

		return notification_definition_list

	return trans_readonly(notification_definition_service, action)


@router.get('/notification/definition', tags=[UserRole.ADMIN, UserRole.CONSOLE], response_model=NotificationDefinition)
def load_notification_by_id(notification_id: NotificationDefinitionId,
                            principal_service: PrincipalService = Depends(get_any_principal)) -> NotificationDefinition:
	notification_definition_service: NotificationDefinitionService = get_notification_definition_service(
		principal_service)

	def action() -> NotificationDefinition:
		notification_definition: Optional[NotificationDefinition] = notification_definition_service.find_by_id(
			notification_id)
		if notification_definition is None:
			raise_404()

		return notification_definition

	return trans_readonly(notification_definition_service, action)


@router.get('/event/definition', tags=[UserRole.ADMIN], response_model=EventDefinition)
def load_event_definition_by_id(event_definition_id: EventDefinitionId,
                                principal_service: PrincipalService = Depends(get_admin_principal)) -> EventDefinition:
	event_definition_service: EventDefinitionService = get_event_definition_service(
		principal_service)

	def action() -> EventDefinition:
		event_definition: Optional[EventDefinition] = event_definition_service.find_by_id(event_definition_id)
		if event_definition is None:
			raise_404()

		return event_definition

	return trans_readonly(event_definition_service, action)


@router.get('/event/definition/role', tags=[UserRole.ADMIN], response_model=List[EventDefinition])
def load_events_by_user_role(user_role: UserRole, principal_service: PrincipalService = Depends(get_admin_principal)) -> \
		List[EventDefinition]:
	event_definition_service: EventDefinitionService = get_event_definition_service(
		principal_service)

	def action() -> List[EventDefinition]:
		event_definition_list: List[EventDefinition] = event_definition_service.find_by_user_role(user_role,
		                                                                                          principal_service.tenantId)
		if event_definition_list is None:
			raise_404()

		return event_definition_list

	return trans_readonly(event_definition_service, action)


@router.post('/notification/definition', tags=[UserRole.ADMIN], response_model=NotificationDefinition)
def save_notification_definition(notification_definition: NotificationDefinition,
                                 principal_service: PrincipalService = Depends(
	                                 get_any_principal)) -> NotificationDefinition:
	validate_tenant_id(notification_definition, principal_service)
	notification_definition_service: NotificationDefinitionService = get_notification_definition_service(
		principal_service)

	def save_notification_definition_action() -> NotificationDefinition:
		if notification_definition_service.is_storable_id_faked(notification_definition.notificationId):
			notification_definition_service.redress_storable_id(notification_definition)
			return notification_definition_service.create(notification_definition)
		else:
			existing_notification_definition: Optional[
				NotificationDefinition] = notification_definition_service.find_by_id(
				notification_definition.notificationId)
			if existing_notification_definition is not None:
				if existing_notification_definition.tenantId != notification_definition.tenantId:
					raise_403()

			return notification_definition_service.update(notification_definition)

	return trans(notification_definition_service, save_notification_definition_action)


@router.post('/subscription/event', tags=[UserRole.ADMIN, UserRole.CONSOLE], response_model=SubscriptionEvent)
def save_subscription_event(subscription_event: SubscriptionEvent,
                            principal_service: PrincipalService = Depends(get_any_principal)) -> SubscriptionEvent:
	validate_tenant_id(subscription_event, principal_service)
	subscription_event_service: SubscriptionEventService = get_subscription_event_service(principal_service)

	def save_subscription_event_action() -> SubscriptionEvent:
		if subscription_event_service.is_storable_id_faked(subscription_event.subscriptionEventId):
			subscription_event_service.redress_storable_id(subscription_event)
			subscription_event.userId = principal_service.userId
			return subscription_event_service.create(subscription_event)
		else:
			existing_subscription_event: Optional[
				SubscriptionEvent] = subscription_event_service.find_by_id(
				subscription_event.subscriptionEventId)
			if existing_subscription_event is not None:
				if existing_subscription_event.tenantId != subscription_event.tenantId:
					raise_403()

			return subscription_event_service.update(subscription_event)

	return trans(subscription_event_service, save_subscription_event_action)


@router.get('/subscription/event/user', tags=[UserRole.ADMIN, UserRole.CONSOLE], response_model=List[SubscriptionEvent])
def load_subscription_events_by_user_id(principal_service: PrincipalService = Depends(get_any_principal)) -> List[
	SubscriptionEvent]:
	subscription_event_service: SubscriptionEventService = get_subscription_event_service(principal_service)

	def action() -> List[SubscriptionEvent]:
		subscription_event_list: List[SubscriptionEvent] = subscription_event_service.find_by_user_id(
			principal_service.userId, principal_service.tenantId)

		return subscription_event_list

	return trans_readonly(subscription_event_service, action)
