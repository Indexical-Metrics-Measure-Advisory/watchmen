import requests
import json
import time
import base64
import hashlib
import hmac
from logging import getLogger
from watchmen_webhook_server.action.executor.abs_executor import ActionExecutor
from watchmen_webhook_server.action.definition import AlertAction
from watchmen_model.webhook.subscription_event import SubscriptionEvent

logger = getLogger(__name__)

class FeishuExecutor(ActionExecutor):
    def support(self, action_type: str) -> bool:
        return action_type == 'feishu'

    def gen_sign(self, timestamp, secret):
        string_to_sign = '{}\n{}'.format(timestamp, secret)
        hmac_code = hmac.new(string_to_sign.encode("utf-8"), digestmod=hashlib.sha256).digest()
        return base64.b64encode(hmac_code).decode('utf-8')

    async def execute(self, action: AlertAction, event: SubscriptionEvent) -> bool:
        params = action.parameters or {}
        
        webhook_url = params.get('webhook_url') 
        secret = params.get('secret')
        content = params.get('content', action.content or 'No content')
        
        if not webhook_url:
            # Fallback to check if user provided host/bot like in old service, but simplified here
            # Ideally we should support both. For now, let's stick to webhook_url as it matches 'Alert' concept better
            logger.error("Feishu webhook_url is required in parameters")
            return False

        headers = {'Content-Type': 'application/json'}
        payload = {
            "msg_type": "text",
            "content": {
                "text": content
            }
        }

        if secret:
            timestamp = int(time.time())
            sign = self.gen_sign(timestamp, secret)
            payload["timestamp"] = timestamp
            payload["sign"] = sign

        try:
            response = requests.post(webhook_url, headers=headers, data=json.dumps(payload))
            if response.status_code == 200:
                res_json = response.json()
                if res_json.get('code') == 0:
                    return True
                else:
                    logger.error(f"Feishu error: {res_json}")
                    return False
            else:
                logger.error(f"Feishu HTTP error: {response.status_code} {response.text}")
                return False
        except Exception as e:
            logger.error(f"Failed to send feishu message: {e}", exc_info=True)
            return False
