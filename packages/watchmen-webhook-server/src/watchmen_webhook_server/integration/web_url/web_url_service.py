from typing import Dict

from watchmen_indicator_surface.meta.indicator_router import get_user_service
from watchmen_auth import fake_super_admin, PrincipalService, fake_tenant_admin
from watchmen_model.admin import User
from watchmen_model.common import UserId
from watchmen_model.webhook.event_defination import EventDefinition
from watchmen_model.webhook.notification_defination import NotificationType, NotificationDefinition, NotificationParam
from watchmen_model.webhook.subscription_event import SubscriptionEvent
from watchmen_utilities import ArrayHelper
from watchmen_webhook_server import NotifyService, build_data_Loader
from wetchmen_webhook.api.webhook_service import load_event_definition_by_id, \
	load_notification_by_id


def call_webhook_url(data, token, url):
	# requests.post()
	#TODO requests.post()
	pass


class WebUrlService(NotifyService):

	def support(self, notification_type: NotificationType) -> bool:
		return NotificationType.WEB_URL == notification_type

	def notify(self, subscription_event: SubscriptionEvent,notification_definition: NotificationDefinition) -> bool:
		user_id: UserId = subscription_event.userId

		# start job status

		notification_definition: NotificationDefinition = load_notification_by_id(subscription_event.notificationId)
		event_definition: EventDefinition = load_event_definition_by_id(subscription_event.eventId)

		# get call back url in params
		principal_service: PrincipalService = fake_super_admin()

		user_service = get_user_service(principal_service)
		user: User = user_service.find_by_id(user_id)

		def convert_params(accumulator: Dict, element: NotificationParam):
			accumulator[element.name] = element.value
			return accumulator

		params_dict = ArrayHelper.reduce(convert_params, notification_definition.params, {})

		if "url" in params_dict:
			url = params_dict["url"]
		else:
			raise ValueError("url not provided in webhook params")
		# get token in params_dict
		token = params_dict.get("token", None)

		data_loader = build_data_Loader(event_definition.eventSource)

		tenant_principal_service: PrincipalService = fake_tenant_admin(user.tenantId, user.userId, user.name)

		data = data_loader.load_data_from_event_sources(event_definition.eventSource, subscription_event.sourceId,
		                                                tenant_principal_service)

		# call back url
		call_webhook_url(data, token, url)

		# set success or failure for lock table


		pass
