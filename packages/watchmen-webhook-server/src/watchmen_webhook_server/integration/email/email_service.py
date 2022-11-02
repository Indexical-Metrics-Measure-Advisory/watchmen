import smtplib
import traceback
from email.mime.application import MIMEApplication
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formatdate
from os.path import basename
from typing import List

from pydantic import BaseModel

from watchmen_auth import fake_super_admin, PrincipalService
from watchmen_meta.common import ask_snowflake_generator, ask_meta_storage
from watchmen_meta.webhook.notification_definition_service import NotificationDefinitionService
from watchmen_model.webhook.notification_defination import NotificationType, NotificationDefinition, NotificationParam
from watchmen_model.webhook.subscription_event import SubscriptionEvent
from watchmen_webhook_server import NotifyService
from watchmen_webhook_server.integration.utils.html_body_builder import build_body
from watchmen_webhook_server.integration.utils.screen_shot_builder import screenshot_to_pdf

#
#
COMMASPACE = ', '


def get_notification_definition_service(principal_service: PrincipalService) -> NotificationDefinitionService:
	return NotificationDefinitionService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


class EmailConfiguration(BaseModel):
	server: str = None
	type: str = None
	send_from: str = None
	send_to: str = None
	subject: str = None
	ssl: int = None
	password: str = None


def build_email_configuration(params:List[NotificationParam]) -> EmailConfiguration:
		if params is not  None:
			params_dict = {notify.name:notify.value for notify in params}
			email_configuration = EmailConfiguration()
			# email_configuration.server = "smtp.feishu.cn"
			# email_configuration.ssl = 465
			# email_configuration.send_from = "ci-postman@mail.matrdata.com"
			# email_configuration.password = "bqQdu8zI6dtXIXag"
			# email_configuration.send_to = "yi.feng@mail.matrdata.com"

			email_configuration.server = params_dict["server"]
			email_configuration.ssl = params_dict["ssl"]
			email_configuration.send_from = params_dict["send_from"]
			email_configuration.password = params_dict["password"]
			email_configuration.send_to = params_dict["send_to"]
			email_configuration.subject="Daily subscription metric "

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
			content = build_body(subscription_event.sourceId,subscription_event.eventSource)
			pdf = await screenshot_to_pdf(subscription_event.sourceId,subscription_event.eventSource)
			send_email_smtp(email_configuration, content, client,pdf )
			return True
		except Exception as err:
				print(traceback.format_exc())
				return False

