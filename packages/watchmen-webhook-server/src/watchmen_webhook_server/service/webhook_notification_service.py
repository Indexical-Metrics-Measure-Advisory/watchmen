from datetime import datetime
from logging import getLogger
from typing import Optional

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
from watchmen_rest.util import validate_tenant_id

logger = getLogger(__name__)

class WebhookNotificationService:
    def __init__(self, principal_service: PrincipalService):
        self.principal_service = principal_service
        self.subscription_event_service = SubscriptionEventService(ask_meta_storage(), ask_snowflake_generator(), principal_service)
        self.notification_definition_service = NotificationDefinitionService(ask_meta_storage(), ask_snowflake_generator(), principal_service)
        self.subscription_event_lock_service = SubscriptionEventLockService(ask_meta_storage(), ask_snowflake_generator(), principal_service)

    def start_event_lock(self, subscription_event: SubscriptionEvent) -> SubscriptionEventLock:
        subscription_event_lock = SubscriptionEventLock(
            subscriptionEventLockId=self.subscription_event_lock_service.generate_storable_id(),
            tenantId=self.principal_service.tenantId,
            subscriptionEventId=subscription_event.subscriptionEventId,
            processDate=datetime.now(),
            status=JobLockStatus.READY,
            userId=self.principal_service.userId,
            createdAt=datetime.now()
        )

        def create_lock_record():
            return self.subscription_event_lock_service.create(subscription_event_lock)

        return trans(self.subscription_event_lock_service, create_lock_record)

    def update_event_lock(self, subscription_event_lock: SubscriptionEventLock, status: JobLockStatus):
        subscription_event_lock.status = status

        def update_lock_record():
            return self.subscription_event_lock_service.update(subscription_event_lock)

        return trans(self.subscription_event_lock_service, update_lock_record)

    async def notify(self, subscription_event_id: SubscriptionEventId) -> bool:
        def load_subscription_event():
            subscription_event: Optional[SubscriptionEvent] = self.subscription_event_service.find_by_id(subscription_event_id)
            validate_tenant_id(subscription_event, self.principal_service)
            return subscription_event

        def load_notification(notification_id: NotificationDefinitionId):
            notification_definition: Optional[NotificationDefinition] = self.notification_definition_service.find_by_id(
                notification_id)
            validate_tenant_id(notification_definition, self.principal_service)
            return notification_definition

        subscription_event: SubscriptionEvent = trans_readonly(self.subscription_event_service, load_subscription_event)

        # start  lock table
        subscription_event_lock: SubscriptionEventLock = self.start_event_lock(subscription_event)

        notification: NotificationDefinition = trans_readonly(self.notification_definition_service,
                                                              lambda: load_notification(subscription_event.notificationId))
        notification_service: NotifyService = find_notification_service(notification.type)

        try:
            result = await notification_service.notify(subscription_event, notification)
            if result:
                self.update_event_lock(subscription_event_lock, JobLockStatus.SUCCESS)
                return True
            else:
                self.update_event_lock(subscription_event_lock, JobLockStatus.FAILED)
                return False
        except Exception as e:
            logger.error("webhook notification error ", exc_info=True, stack_info=True)
            self.update_event_lock(subscription_event_lock, JobLockStatus.FAILED)
            return False
