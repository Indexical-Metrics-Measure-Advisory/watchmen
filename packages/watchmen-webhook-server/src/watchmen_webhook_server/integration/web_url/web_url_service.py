import json
from logging import getLogger
from typing import Dict, Optional

import requests
from pydantic import BaseModel

from watchmen_auth import fake_super_admin, PrincipalService, fake_tenant_admin
from watchmen_meta.admin import UserService
from watchmen_model.admin import User
from watchmen_model.common import UserId
from watchmen_model.webhook.event_defination import EventSource
from watchmen_model.webhook.notification_defination import NotificationType, NotificationDefinition, NotificationParam
from watchmen_model.webhook.subscription_event import SubscriptionEvent
from watchmen_utilities import ArrayHelper, ExtendedBaseModel
from watchmen_webhook_server import NotifyService, build_data_Loader
from watchmen_webhook_server.integration.notify_service import get_user_service

logger = getLogger(__name__)


class WebUrlParams(ExtendedBaseModel):
	url: Optional[str] = None
	headers: Optional[Dict[str, str]] = None


class WebUrlData(ExtendedBaseModel):
	eventSource: Optional[EventSource] = None
	data: Optional[Dict] = None


def call_webhook_url(data, web_url_params: WebUrlParams) -> bool:
	response = requests.post(url=web_url_params.url, data=json.dumps(data), headers=web_url_params.headers)
	if response.status_code != 200:
		raise Exception("call web url error {}".format(response.text))
	else:
		return True


def build_web_url_params(notification_definition: NotificationDefinition):
	web_url_params = WebUrlParams()

	def convert_params(accumulator: Dict, element: NotificationParam):
		accumulator[element.name] = element.value
		return accumulator

	params_dict = ArrayHelper(notification_definition.params).reduce(convert_params, {})

	if "url" in params_dict:
		web_url_params.url = params_dict["url"]
		del params_dict['url']
	else:
		raise ValueError("url not provided in webhook params")

	web_url_params.headers = params_dict
	return web_url_params


class WebUrlService(NotifyService):

	def support(self, notification_type: NotificationType) -> bool:
		return NotificationType.WEB_URL == notification_type

	def notify(self, subscription_event: SubscriptionEvent, notification_definition: NotificationDefinition) -> bool:
		user_id: UserId = subscription_event.user

		try:
			web_url_params: WebUrlParams = build_web_url_params(notification_definition)
			principal_service: PrincipalService = fake_super_admin()
			user_service: UserService = get_user_service(principal_service)
			user: Optional[User] = user_service.find_by_id(user_id)
			tenant_principal_service: PrincipalService = fake_tenant_admin(user.tenantId, user.userId, user.name)

			subscription_event_data = build_data_Loader(subscription_event.eventSource).load_data_from_event_sources(
				subscription_event.eventSource, subscription_event.sourceId,
				tenant_principal_service)

			web_url_data: WebUrlData = WebUrlData(eventSource=subscription_event.eventSource,
			                                      data=subscription_event_data)
			return call_webhook_url(web_url_data, web_url_params)
		except Exception as err:
			logger.error(err,stack_info=True)
			return False
