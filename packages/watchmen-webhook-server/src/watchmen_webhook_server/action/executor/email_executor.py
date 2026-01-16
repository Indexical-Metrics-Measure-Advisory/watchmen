from typing import Dict, Any, Optional
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formatdate
from logging import getLogger
from watchmen_webhook_server.action.executor.abs_executor import ActionExecutor
from watchmen_webhook_server.action.definition import AlertAction
from watchmen_model.webhook.subscription_event import SubscriptionEvent

logger = getLogger(__name__)

class EmailExecutor(ActionExecutor):
    def support(self, action_type: str) -> bool:
        return action_type == 'email'

    async def execute(self, action: AlertAction, event: SubscriptionEvent) -> bool:
        params = action.parameters or {}
        
        server = params.get('server')
        port = int(params.get('port', 465))
        ssl = params.get('ssl', True)
        username = params.get('username')
        password = params.get('password')
        send_from = params.get('from', username)
        send_to = params.get('to')
        subject = params.get('subject', action.name or 'Watchmen Notification')
        content = params.get('content', action.content or 'No content')

        # Allow basic validation
        if not (server and username and password and send_to):
            logger.error(f"Missing required email parameters: {params}")
            return False

        try:
            msg = MIMEMultipart()
            msg['From'] = send_from
            msg['To'] = send_to
            msg['Date'] = formatdate(localtime=True)
            msg['Subject'] = subject
            msg.attach(MIMEText(content))

            if ssl:
                smtp = smtplib.SMTP_SSL(server, port)
            else:
                smtp = smtplib.SMTP(server, port)
            
            smtp.login(username, password)
            smtp.sendmail(send_from, send_to, msg.as_string())
            smtp.close()
            return True
        except Exception as e:
            logger.error(f"Failed to send email: {e}", exc_info=True)
            return False
