from watchmen_model.webhook.notification_defination import NotificationType
from watchmen_webhook_server.integration.notify_service import NotifyService
from watchmen_webhook_server.integration.email.email_service import EmailService
from watchmen_webhook_server.integration.feishu.feishu_service import FeishuService
from watchmen_webhook_server.integration.slack.slack_service import SlackService
from watchmen_webhook_server.integration.web_url.web_url_service import WebUrlService


def find_notification_service(notification_type: NotificationType) -> NotifyService:
	if notification_type == NotificationType.EMAIL:
		return EmailService()
	elif notification_type == NotificationType.WEB_URL:
		return WebUrlService()
	elif notification_type == NotificationType.FEISHU:
		return FeishuService()
	elif notification_type == NotificationType.SLACK:
		return SlackService()
	else:
		raise Exception("notification type not supported {}".format(notification_type))
