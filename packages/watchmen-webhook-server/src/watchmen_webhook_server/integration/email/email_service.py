import smtplib
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formatdate
from logging import getLogger
from typing import List, Optional

from watchmen_model.webhook.notification_defination import NotificationType, NotificationDefinition, NotificationParam
from watchmen_model.webhook.subscription_event import SubscriptionEvent
from watchmen_utilities import ExtendedBaseModel
from watchmen_webhook_server import NotifyService
from watchmen_webhook_server.integration.utils.html_body_builder import build_body
from watchmen_webhook_server.integration.utils.screen_shot_builder import screenshot_page

#
#
COMMASPACE = ', '
logger = getLogger(__name__)


class EmailConfiguration(ExtendedBaseModel):
	server: Optional[str] = None
	type: Optional[str] = None
	send_from: Optional[str] = None
	send_to: Optional[str] = None
	subject: Optional[str] = None
	ssl: Optional[int] = None
	password: Optional[str] = None


def build_email_configuration(params: List[NotificationParam]) -> EmailConfiguration:
	if params is not None:
		params_dict = {notify.name: notify.value for notify in params}
		email_configuration = EmailConfiguration()
		email_configuration.server = params_dict["server"]
		email_configuration.ssl = params_dict["ssl"]
		email_configuration.send_from = params_dict["send_from"]
		email_configuration.password = params_dict["password"]
		email_configuration.send_to = params_dict["send_to"]
		email_configuration.subject = "Daily Subscription metric"
		return email_configuration
	else:
		raise Exception("Invalid email configuration")


def send_email_smtp(email_configuration: EmailConfiguration, text, smtp, files=None):
	msg = MIMEMultipart()
	msg['From'] = email_configuration.send_from
	msg['To'] = email_configuration.send_to
	msg['Date'] = formatdate(localtime=True)
	msg['Subject'] = email_configuration.subject
	msg.attach(MIMEText(text))
	if files is not None:
		image = MIMEImage(files, name="indicators.png")
		msg.attach(image)
	smtp.login(email_configuration.send_from, email_configuration.password)
	smtp.sendmail(email_configuration.send_from, email_configuration.send_to, msg.as_string())
	smtp.close()


def build_smtp_connection(email_configuration):
	return smtplib.SMTP_SSL(email_configuration.server, email_configuration.ssl)


class EmailService(NotifyService):

	def support(self, notification_type: NotificationType):
		return NotificationType.EMAIL == notification_type

	async def notify(self, subscription_event: SubscriptionEvent,
	                 notification_definition: NotificationDefinition) -> bool:

		try:
			email_configuration: EmailConfiguration = build_email_configuration(notification_definition.params)
			client = build_smtp_connection(email_configuration)
			content = build_body(subscription_event.sourceId, subscription_event.eventSource)
			image = await screenshot_page(subscription_event.sourceId, subscription_event.eventSource)
			send_email_smtp(email_configuration, content, client, image)
			return True
		except Exception as err:
			logger.error(err, exc_info=True, stack_info=True)
			return False
