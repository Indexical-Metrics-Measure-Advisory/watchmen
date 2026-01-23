from fastapi import APIRouter, Depends
from watchmen_auth import PrincipalService
from watchmen_model.common import SubscriptionEventId
from watchmen_rest import get_any_principal
from watchmen_webhook_server.service.webhook_notification_service import WebhookNotificationService

router = APIRouter()

@router.get('/notify', tags=['webhook'])
async def notify(subscription_event_id: SubscriptionEventId,
                 principal_service: PrincipalService = Depends(get_any_principal)):
    webhook_notification_service = WebhookNotificationService(principal_service)
    return await webhook_notification_service.notify(subscription_event_id)
