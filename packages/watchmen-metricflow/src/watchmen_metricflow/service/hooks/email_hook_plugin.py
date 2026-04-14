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

    def _get_from_dict(self, params: dict, key: str) -> Any:
        if params is None:
            return None
        return params.get(key)

    def _resolve(self, action: AlertAction, key: str, default: Any = None) -> Any:
        val = self._get_from_dict(action.parameters, key)
        if val is not None:
            return val
        suggested_params = (action.suggestedAction or {}).get('parameters')
        val = self._get_from_dict(suggested_params, key)
        if val is not None:
            return val
        # action_type_params = (action.actionType or {}).get('parameters')
        # val = self._get_from_dict(action_type_params, key)
        return default if val is None else val

    async def execute(self, action: AlertAction, rule: GlobalAlertRule, message: str) -> bool:
        logger.info(f'[EmailHookPlugin] action.parameters: {action.parameters}')
        logger.info(f'[EmailHookPlugin] action.suggestedAction: {action.suggestedAction}')
        logger.info(f'[EmailHookPlugin] action.actionType: {action.actionType}')
        logger.info(f'[EmailHookPlugin] action.target: {action.target}')
        server = self._resolve(action, 'host') or self._resolve(action, 'server')
        if server is None:
            logger.warning('smtp server not configured, skipping email')
            return False
        timeout = int(self._resolve(action, 'timeout', 30))
        port = int(self._resolve(action, 'port', 465))
        ssl = self._safe_bool(self._resolve(action, 'ssl'), True)
        username = self._resolve(action, 'username') or self._resolve(action, 'user')
        password = self._resolve(action, 'password')
        send_from = self._resolve(action, 'from') or username
        send_to = self._resolve(action, 'to') or action.target
        subject = self._resolve(action, 'subject') or f'Alert triggered: {rule.name}'
        content = self._resolve(action, 'content') or action.content or message
        logger.info(f'[EmailHookPlugin] resolved params - server: {server}, port: {port}, ssl: {ssl}, '
                    f'username: {username}, send_from: {send_from}, send_to: {send_to}, subject: {subject}')
        if username is None or password is None or send_from is None or send_to is None:
            logger.warning('email credential incomplete, skipping email')
            return False
        try:
            recipients = send_to if isinstance(send_to, list) else [x.strip() for x in str(send_to).split(',') if x.strip()]
            if len(recipients) == 0:
                return False
            msg = MIMEMultipart()
            msg['From'] = send_from
            msg['To'] = ', '.join(recipients)
            msg['Date'] = formatdate(localtime=True)
            msg['Subject'] = subject
            msg.attach(MIMEText(content, 'html'))
            if ssl:
                smtp = smtplib.SMTP_SSL(server, port, timeout=timeout)
            else:
                smtp = smtplib.SMTP(server, port, timeout=timeout)
            smtp.login(username, password)
            smtp.sendmail(send_from, recipients, msg.as_string())
            smtp.close()
            logger.info(f'alert email sent to {recipients}')
            return True
        except Exception:
            logger.exception(f'failed to send alert email to {send_to}')
            return False
