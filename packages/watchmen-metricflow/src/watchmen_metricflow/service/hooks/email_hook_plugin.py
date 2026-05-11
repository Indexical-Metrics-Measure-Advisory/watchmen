import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formatdate
from logging import getLogger
from typing import Any

from watchmen_metricflow.model.alert_rule import AlertAction, GlobalAlertRule
from watchmen_metricflow.service.alert_email_body_builder import build_alert_body_from_rule

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

    @staticmethod
    def _is_blank_text(value: Any) -> bool:
        return value is None or (isinstance(value, str) and len(value.strip()) == 0)

    async def execute(self, action: AlertAction, rule: GlobalAlertRule, message: str,
                    condition_results: list = None,
                    report_data: list = None,
                    share_link: str = None) -> bool:
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
        if self._is_blank_text(share_link):
            share_link = (
                self._resolve(action, 'shareLink')
                or self._resolve(action, 'share_link')
                or self._resolve(action, 'link')
            )
        explicit_param_content = any(
            not self._is_blank_text(self._get_from_dict(action.parameters or {}, key))
            for key in ('content', 'body', 'html', 'htmlBody', 'template')
        )
        content = self._resolve(action, 'content')
        content_source = 'parameters.content'
        if self._is_blank_text(content):
            content = self._resolve(action, 'body')
            content_source = 'parameters.body'
        if self._is_blank_text(content):
            content = self._resolve(action, 'html')
            content_source = 'parameters.html'
        if self._is_blank_text(content):
            content = self._resolve(action, 'htmlBody')
            content_source = 'parameters.htmlBody'
        if self._is_blank_text(content):
            content = self._resolve(action, 'template')
            content_source = 'parameters.template'
        if self._is_blank_text(content):
            content = action.content
            content_source = 'action.content'
        if self._is_blank_text(content):
            content = action.template
            content_source = 'action.template'
        if self._is_blank_text(content):
            content = (action.suggestedAction or {}).get('description')
            content_source = 'suggestedAction.description'
        if self._is_blank_text(content):
            content = message
            content_source = 'alert.message'
        if report_data and not explicit_param_content:
            content = build_alert_body_from_rule(rule, message, condition_results, report_data, share_link)
            content_source = 'subscription_runner_report_html'
        elif self._is_blank_text(content) or content == message:
            content = build_alert_body_from_rule(rule, message, condition_results, report_data, share_link)
            content_source = 'subscription_runner_alert_html'
        logger.info(f'[EmailHookPlugin] resolved params - server: {server}, port: {port}, ssl: {ssl}, '
                    f'username: {username}, send_from: {send_from}, send_to: {send_to}, subject: {subject}, '
                    f'content_source: {content_source}, content_length: {len(str(content)) if content is not None else 0}')
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
