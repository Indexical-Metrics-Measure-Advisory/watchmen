import base64
import hashlib
import hmac
import json
from datetime import datetime
from logging import getLogger
from typing import List, Optional

import requests
from pydantic import BaseModel

from watchmen_model.webhook.notification_defination import NotificationType, NotificationDefinition, NotificationParam
from watchmen_model.webhook.subscription_event import SubscriptionEvent
from watchmen_utilities import ExtendedBaseModel
from watchmen_webhook_server.integration.notify_service import NotifyService
from watchmen_webhook_server.integration.utils.screen_shot_builder import screenshot_page

SEND_MESSAGE = "message/v4/send/"

UPLOAD_IMAGE = "im/v1/images"

ACCESS_TOKEN_PATH = "auth/v3/tenant_access_token/internal"

logger = getLogger(__name__)


class FeishuConfig(ExtendedBaseModel):
	feishuHost: str = 'https://open.feishu.cn/open-apis/'
	feishuAppId: Optional[str] = None
	feishuAppSecret: Optional[str] = None
	feishuBot: Optional[str] = None
	feishuBotSecret: Optional[str] = None


def gen_sign(timestamp, secret):
	string_to_sign = '{}\n{}'.format(timestamp, secret)
	hmac_code = hmac.new(string_to_sign.encode("utf-8"), digestmod=hashlib.sha256).digest()

	sign = base64.b64encode(hmac_code).decode('utf-8')

	return sign


def get_feishu_configuration(params: List[NotificationParam]) -> FeishuConfig:
	if params is not None:
		params_dict = {notify.name: notify.value for notify in params}
		feishu_configuration = FeishuConfig()
		feishu_configuration.feishuHost = params_dict["host"]
		feishu_configuration.feishuAppId = params_dict["app_id"]
		feishu_configuration.feishuAppSecret = params_dict["app_secret"]
		feishu_configuration.feishuBot = params_dict["bot"]
		feishu_configuration.feishuBotSecret = params_dict.get("bot_secret",None)
		return feishu_configuration
	else:
		raise Exception("Invalid feishu configuration")



class FeishuService(NotifyService):

	async def get_access_token(self, feishu_configuration: FeishuConfig):
		access_token_url = feishu_configuration.feishuHost + ACCESS_TOKEN_PATH
		payload = json.dumps({
			"app_id": feishu_configuration.feishuAppId,
			"app_secret": feishu_configuration.feishuAppSecret
		})

		headers = {
			'Content-Type': 'application/json'
		}
		response = requests.post(access_token_url, headers=headers, data=payload)

		auth_result = response.json()
		if "tenant_access_token" in auth_result:
			return auth_result["tenant_access_token"]
		else:
			raise Exception("feishu get access_token failed")

	async def upload_image(self, image, feishu_configuration: FeishuConfig) -> str:
		upload_image_url = feishu_configuration.feishuHost + UPLOAD_IMAGE
		token = await self.get_access_token(feishu_configuration)

		try:
			resp = requests.post(
				url=upload_image_url,
				headers={'Authorization': "Bearer " + token},
				files={
					"image": image
				},
				data={
					"image_type": "message"
				},
				stream=True)
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)

		upload_image_result = resp.json()
		if "image_key" in upload_image_result["data"]:
			return upload_image_result["data"]["image_key"]
		else:
			raise Exception("upload_image is failed")

	async def send_message_card(self, image_key: str, feishu_configuration: FeishuConfig) -> bool:
		bot_url = feishu_configuration.feishuHost + feishu_configuration.feishuBot
		bot_secret = feishu_configuration.feishuBotSecret
		headers = {
			'Content-Type': 'application/json'
		}

		payload = {
			"msg_type": "interactive",
			"card": {
				"elements": [
					{
						"tag": "img",
						"title": {
							"tag": "plain_text",
							"content": "Indicator Card"
						},
						"img_key": image_key,
						"mode": "fit_horizontal",
						"alt": {
							"tag": "plain_text",
							"content": "Hover"
						}
					}
				]
			}
		}

		if bot_secret is not None:
			dt = datetime.now()
			ts = datetime.timestamp(dt)
			sign = gen_sign(ts, feishu_configuration.feishuBotSecret)
			payload["timestamp"] = ts
			payload["sign"] = sign

		response = requests.post(bot_url, headers=headers, data=json.dumps(payload))
		if response.status_code == 200:
			return True
		else:
			raise Exception("send feishu message is failed")

	def support(self, notification_type: NotificationType):
		return notification_type == NotificationType.FEISHU

	async def notify(self, subscription_event: SubscriptionEvent,
	                 notification_definition: NotificationDefinition) -> bool:

		## validation configuration
		feishu_configuration = get_feishu_configuration(notification_definition.params)

		## generate image
		image = await screenshot_page(subscription_event.sourceId, subscription_event.eventSource)
		## upload image
		image_key = await self.upload_image(image, feishu_configuration)
		## send message card
		return await self.send_message_card(image_key, feishu_configuration)



