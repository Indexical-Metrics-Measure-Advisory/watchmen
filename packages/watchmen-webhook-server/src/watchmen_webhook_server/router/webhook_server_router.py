from datetime import datetime
from logging import getLogger
from typing import Optional

from fastapi import APIRouter, Depends
from watchmen_webhook_server.integration.notify_service import NotifyService
from watchmen_webhook_server.integration.index import find_notification_service
from watchmen_webhook_server.utils.trans import trans, trans_readonly

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.webhook.notification_definition_service import NotificationDefinitionService
from watchmen_meta.webhook.subscription_event_lock_service import SubscriptionEventLockService
from watchmen_meta.webhook.subscription_event_service import SubscriptionEventService
from watchmen_model.common import NotificationDefinitionId, SubscriptionEventId
from watchmen_model.webhook.notification_defination import NotificationDefinition
from watchmen_model.webhook.subscription_event import SubscriptionEvent
from watchmen_model.webhook.subscription_event_lock import JobLockStatus, SubscriptionEventLock
from watchmen_rest import get_any_principal
from watchmen_rest.util import validate_tenant_id

router = APIRouter()

logger = getLogger(__name__)


def get_notification_definition_service(principal_service: PrincipalService) -> NotificationDefinitionService:
	return NotificationDefinitionService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_subscription_event_service(principal_service: PrincipalService) -> SubscriptionEventService:
	return SubscriptionEventService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_subscription_event_lock_service(principal_service: PrincipalService) -> SubscriptionEventLockService:
	return SubscriptionEventLockService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def start_event_lock(subscription_event: SubscriptionEvent,
                     principal_service: PrincipalService) -> SubscriptionEventLock:
	subscription_event_lock_service = get_subscription_event_lock_service(principal_service)

	subscription_event_lock = SubscriptionEventLock(
		subscriptionEventLockId=subscription_event_lock_service.generate_storable_id(),
		tenantId=principal_service.tenantId,
		subscriptionEventId=subscription_event.subscriptionEventId,
		processDate=datetime.now(),
		status=JobLockStatus.READY,
		userId=principal_service.userId,
		createdAt=datetime.now()
	)

	def create_lock_record():
		return subscription_event_lock_service.create(subscription_event_lock)

	return trans(subscription_event_lock_service, create_lock_record)


def update_event_lock(subscription_event_lock: SubscriptionEventLock, status: JobLockStatus,
                      principal_service: PrincipalService):
	subscription_event_lock_service = get_subscription_event_lock_service(principal_service)
	subscription_event_lock.status = status

	def update_lock_record():
		return subscription_event_lock_service.update(subscription_event_lock)

	return trans(subscription_event_lock_service, update_lock_record)


@router.get('/notify', tags=['webhook'])
async def notify(subscription_event_id: SubscriptionEventId,
                 principal_service: PrincipalService = Depends(get_any_principal)):
	subscription_event_service: SubscriptionEventService = get_subscription_event_service(principal_service)
	notification_definition_service: NotificationDefinitionService = get_notification_definition_service(
		principal_service)

	def load_subscription_event():
		subscription_event: Optional[SubscriptionEvent] = subscription_event_service.find_by_id(subscription_event_id)
		validate_tenant_id(subscription_event, principal_service)
		return subscription_event

	def load_notification(notification_id: NotificationDefinitionId):
		notification_definition: Optional[NotificationDefinition] = notification_definition_service.find_by_id(
			notification_id)
		validate_tenant_id(notification_definition, principal_service)
		return notification_definition

	subscription_event: SubscriptionEvent = trans_readonly(subscription_event_service, load_subscription_event)

	# start  lock table
	subscription_event_lock: SubscriptionEventLock = start_event_lock(subscription_event,
	                                                                  subscription_event_service.principalService)

	notification: NotificationDefinition = trans_readonly(notification_definition_service,
	                                                      lambda: load_notification(subscription_event.notificationId))
	notification_service: NotifyService = find_notification_service(notification.type)

	try:
		result = await notification_service.notify(subscription_event, notification)
		if result:
			update_event_lock(subscription_event_lock, JobLockStatus.SUCCESS,
			                  subscription_event_service.principalService)
		else:
			update_event_lock(subscription_event_lock, JobLockStatus.FAILED,
			                  subscription_event_service.principalService)
	except:
		logger.error("webhook notification error ", exc_info=True, stack_info=True)
		update_event_lock(subscription_event_lock, JobLockStatus.FAILED, subscription_event_service.principalService)
