import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formatdate
from logging import getLogger
from typing import Any

from watchmen_metricflow.model.alert_rule import AlertAction, GlobalAlertRule

from .alert_hook_plugin import AlertHookPlugin

logger = getLogger(__name__)


class EmailHookPlugin(AlertHookPlugin):
    def support(self, action_type: str) -> bool:
        return action_type.lower() == 'notification'

    @staticmethod
    def _safe_bool(value: Any, default: bool = True) -> bool:
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            lowered = value.strip().lower()
            if lowered in {'true', '1', 'yes', 'y'}:
                return True
            if lowered in {'false', '0', 'no', 'n'}:
                return False
        return default

    async def execute(self, action: AlertAction, rule: GlobalAlertRule, message: str) -> bool:
        print("email:",message)
        params = action.parameters or {}
        server = params.get('server') or params.get('host')
        if server is None:
            return False
        port = int(params.get('port', 465))
        ssl = self._safe_bool(params.get('ssl'), True)
        username = params.get('username') or params.get('user')
        password = params.get('password')
        send_from = params.get('from') or username
        send_to = params.get('to') or action.target
        subject = params.get('subject') or f'Alert triggered: {rule.name}'
        content = params.get('content') or action.content or message
        if username is None or password is None or send_from is None or send_to is None:
            return False
        try:
            msg = MIMEMultipart()
            msg['From'] = send_from
            msg['To'] = send_to
            msg['Date'] = formatdate(localtime=True)
            msg['Subject'] = subject
            msg.attach(MIMEText(content))
            smtp = smtplib.SMTP_SSL(server, port) if ssl else smtplib.SMTP(server, port)
            smtp.login(username, password)
            smtp.sendmail(send_from, send_to, msg.as_string())
            smtp.close()
            return True
        except Exception:
            logger.exception('failed to send alert email')
            return False
