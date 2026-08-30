import asyncio
import base64
import hashlib
import hmac
import json
from logging import getLogger
from time import time
from typing import Optional

from watchmen_auth import PrincipalService
from watchmen_meta.common import PublishNotificationService, ask_meta_storage, ask_snowflake_generator
from watchmen_model.system import PublishNotificationResource, PublishNotificationSetting, \
	PublishNotificationTargetType
from watchmen_utilities import get_current_time_in_seconds, is_blank, is_not_blank, serialize_to_json

logger = getLogger(f'app.{__name__}')

# external call timeout, in seconds
NOTIFY_TIMEOUT = 10

RESOURCE_LABELS = {
	PublishNotificationResource.TOPIC.value: 'Topic',
	PublishNotificationResource.PIPELINE.value: 'Pipeline',
}


def build_publish_payload(
		resource: str, action: str, tuple_id: Optional[str], tuple_name: Optional[str],
		principal_service: PrincipalService) -> dict:
	return {
		'event': 'config.published',
		'resource': resource,
		'action': action,
		'tenantId': principal_service.get_tenant_id(),
		'operator': {
			'userId': principal_service.get_user_id(),
			'userName': principal_service.get_user_name()
		},
		'tupleId': tuple_id,
		'tupleName': tuple_name,
		'occurredAt': get_current_time_in_seconds().isoformat()
	}


def sign_feishu_bot(secret: str, timestamp: int) -> str:
	string_to_sign = f'{timestamp}\n{secret}'
	hmac_code = hmac.new(string_to_sign.encode('utf-8'), digestmod=hashlib.sha256).digest()
	return base64.b64encode(hmac_code).decode('utf-8')


def build_feishu_text(payload: dict) -> str:
	if payload.get('event') == 'config.published.test':
		return '【Watchmen】发布通知测试成功，外部通知目标可用。'
	label = RESOURCE_LABELS.get(payload.get('resource'), payload.get('resource'))
	action_label = '新建' if payload.get('action') == 'create' else '更新'
	operator = (payload.get('operator') or {}).get('userName')
	return f'【Watchmen】{label}「{payload.get("tupleName")}」已发布（{action_label}）\n' \
	       f'操作人：{operator}\n时间：{payload.get("occurredAt")}'


def build_feishu_body(setting: PublishNotificationSetting, payload: dict) -> dict:
	body = {'msg_type': 'text', 'content': {'text': build_feishu_text(payload)}}
	if is_not_blank(setting.secret):
		timestamp = int(time())
		body['timestamp'] = timestamp
		body['sign'] = sign_feishu_bot(setting.secret.strip(), timestamp)
	return body


def post_json(url: str, body: dict, headers: dict) -> str:
	# lazy load, requests is an optional dependency of the doll
	# noinspection PyPackageRequirements
	from requests import post
	response = post(url=url, timeout=NOTIFY_TIMEOUT, data=serialize_to_json(body), headers=headers)
	if response.status_code != 200:
		raise RuntimeError(f'HTTP {response.status_code}, {response.text[:200]}')
	return response.text


def send_to_feishu(setting: PublishNotificationSetting, payload: dict) -> None:
	response_text = post_json(
		setting.url, build_feishu_body(setting, payload), {'Content-Type': 'application/json'})
	# feishu bot returns 200 even when the message is rejected, the business code tells the truth
	try:
		result = json.loads(response_text)
	except json.JSONDecodeError:
		return
	code = result.get('code', result.get('StatusCode'))
	if code is not None and code != 0:
		raise RuntimeError(f'Feishu bot returned code {code}, {result.get("msg")}')


def send_to_webhook(setting: PublishNotificationSetting, payload: dict) -> None:
	headers = {'Content-Type': 'application/json'}
	if is_not_blank(setting.secret):
		headers['Authorization'] = f'Bearer {setting.secret.strip()}'
	post_json(setting.url, payload, headers)


def send_publish_notification(setting: PublishNotificationSetting, payload: dict) -> None:
	if setting.type == PublishNotificationTargetType.FEISHU:
		send_to_feishu(setting, payload)
	elif setting.type == PublishNotificationTargetType.WEBHOOK:
		send_to_webhook(setting, payload)
	else:
		raise RuntimeError(f'Unknown publish notification target type: {setting.type}')


def send_publish_notification_test(setting: PublishNotificationSetting) -> None:
	"""
	send a test message to the given (usually unsaved) setting, raises on any failure
	"""
	if is_blank(setting.url):
		raise RuntimeError('Notification target url is required.')
	send_publish_notification(setting, {'event': 'config.published.test'})


def find_publish_notification_setting(principal_service: PrincipalService) -> Optional[PublishNotificationSetting]:
	service = PublishNotificationService(ask_meta_storage(), ask_snowflake_generator(), principal_service)
	service.begin_transaction()
	try:
		return service.find_by_tenant(principal_service.get_tenant_id())
	finally:
		service.close_transaction()


def to_resource_values(resources) -> list:
	if resources is None:
		return []
	return [resource.value if isinstance(resource, PublishNotificationResource) else resource for resource in resources]


def run_notify(
		resource: str, action: str, tuple_id: Optional[str], tuple_name: Optional[str],
		principal_service: PrincipalService) -> None:
	try:
		setting = find_publish_notification_setting(principal_service)
		if setting is None or not setting.enabled:
			return
		if resource not in to_resource_values(setting.resources):
			return
		payload = build_publish_payload(resource, action, tuple_id, tuple_name, principal_service)
		send_publish_notification(setting, payload)
	except Exception as e:
		# notification must never break the save request
		logger.warning(f'Failed to send publish notification: {e}', exc_info=True)


def log_notify_failure(future) -> None:
	try:
		error = future.exception()
	except asyncio.CancelledError:
		return
	if error is not None:
		logger.warning(f'Failed to send publish notification: {error}', exc_info=error)


def notify_publish(
		resource: str, action: str, tuple_id: Optional[str], tuple_name: Optional[str],
		principal_service: PrincipalService) -> None:
	"""
	fire-and-forget publish notification after a topic/pipeline is saved,
	never blocks or breaks the save request itself
	"""
	try:
		loop = asyncio.get_running_loop()
	except RuntimeError:
		# no running loop, notify synchronously as a fallback
		run_notify(resource, action, tuple_id, tuple_name, principal_service)
		return
	future = loop.run_in_executor(
		None, run_notify, resource, action, tuple_id, tuple_name, principal_service)
	future.add_done_callback(log_notify_failure)
