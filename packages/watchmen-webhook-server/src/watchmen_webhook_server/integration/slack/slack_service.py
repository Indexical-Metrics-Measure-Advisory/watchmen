from logging import getLogger
from typing import List, Optional

import requests
from pydantic import BaseModel

from watchmen_model.webhook.notification_defination import NotificationDefinition, NotificationType, NotificationParam
from watchmen_model.webhook.subscription_event import SubscriptionEvent
from watchmen_utilities import ExtendedBaseModel
from watchmen_webhook_server.integration.notify_service import NotifyService
from watchmen_webhook_server.integration.utils.screen_shot_builder import screenshot_page

FILE_UPLOAD = "files.upload"

logger = getLogger(__name__)


class SlackConfiguration(ExtendedBaseModel):
	channelId: Optional[str] = None
	host: str = "https://slack.com/api/"
	token: Optional[str] = None


def get_slack_configuration(params: List[NotificationParam]):
	if params is not None:
		params_dict = {notify.name: notify.value for notify in params}
		slack_configuration = SlackConfiguration()
		slack_configuration.host = params_dict["host"]
		slack_configuration.token = params_dict["token"]
		slack_configuration.channelId = params_dict["channel"]
		return slack_configuration
	else:
		raise Exception("Invalid slack configuration")


class SlackService(NotifyService):

	async def upload_image_and_send(self, image, slack_configuration: SlackConfiguration) -> bool:
		upload_image_url = slack_configuration.host + FILE_UPLOAD
		token = slack_configuration.token
		file_upload = {
			"file": ("indicator.png",
			         image, 'png')
		}

		payload = {
			"channels": "C041BK5J0HY",
			"title": "Daily Subscription metric"
		}

		try:
			resp = requests.post(
				url=upload_image_url,
				headers={'Authorization': "Bearer " + token},
				files=file_upload,
				data=payload,
				stream=True)

		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)

		slack_result = resp.json()
		print(slack_result)
		if "ok" in slack_result:
			if "true" == slack_result["ok"]:
				return True
			else:
				return False
		else:
			return False

	# upload_image_result = resp.json()
	# if "image_key" in upload_image_result["data"]:
	# 	return upload_image_result["data"]["image_key"]
	# else:
	# 	raise Exception("upload_image is failed")
	# pass

	async def send_message_card(self, image_key, slack_configuration: SlackConfiguration) -> bool:
		pass

	def support(self, notification_type: NotificationType):
		return notification_type == NotificationType.SLACK

	async def notify(self, subscription_event: SubscriptionEvent,
	                 notification_definition: NotificationDefinition) -> bool:

		slack_configuration = get_slack_configuration(notification_definition.params)

		image = await screenshot_page(subscription_event.sourceId, subscription_event.eventSource)

		return await self.upload_image_and_send(image, slack_configuration)
