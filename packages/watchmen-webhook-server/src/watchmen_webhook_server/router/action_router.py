from fastapi import APIRouter
from watchmen_webhook_server.action.definition import AlertAction
from watchmen_webhook_server.action.action_service import ActionService
from watchmen_model.webhook.subscription_event import SubscriptionEvent

router = APIRouter()
action_service = ActionService()

@router.post('/action/notify', tags=['webhook'])
async def notify_action(action: AlertAction, event: SubscriptionEvent):
    return await action_service.notify(action, event)
