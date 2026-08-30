from logging import getLogger
from typing import Optional

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_meta.common import PublishNotificationService, ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import UserRole
from watchmen_model.system import PublishNotificationSetting
from watchmen_rest import get_admin_principal
from watchmen_rest.util import raise_400, validate_tenant_id
from watchmen_utilities import is_blank

from watchmen_rest_doll.util import trans, trans_readonly

from .publish_notifier import send_publish_notification_test

logger = getLogger(f'app.{__name__}')

router = APIRouter()


def get_publish_notification_service(principal_service: PrincipalService) -> PublishNotificationService:
	return PublishNotificationService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def validate_publish_notification_setting(setting: PublishNotificationSetting) -> None:
	if not setting.enabled:
		return
	if setting.type is None:
		raise_400('Notification target type is required.')
	if is_blank(setting.url):
		raise_400('Notification target url is required.')
	if setting.resources is None or len(setting.resources) == 0:
		raise_400('At least one resource is required.')


@router.get('/publish/notification/setting', tags=[UserRole.ADMIN], response_model=None)
def load_publish_notification_setting(
		principal_service: PrincipalService = Depends(get_admin_principal)) -> Optional[PublishNotificationSetting]:
	service = get_publish_notification_service(principal_service)

	def action() -> Optional[PublishNotificationSetting]:
		return service.find_by_tenant(principal_service.get_tenant_id())

	return trans_readonly(service, action)


@router.post('/publish/notification/setting', tags=[UserRole.ADMIN], response_model=PublishNotificationSetting)
def save_publish_notification_setting(
		setting: PublishNotificationSetting,
		principal_service: PrincipalService = Depends(get_admin_principal)) -> PublishNotificationSetting:
	validate_tenant_id(setting, principal_service)
	validate_publish_notification_setting(setting)
	service = get_publish_notification_service(principal_service)

	def save_action() -> PublishNotificationSetting:
		existing: Optional[PublishNotificationSetting] = service.find_by_tenant(principal_service.get_tenant_id())
		if existing is None:
			if service.is_storable_id_faked(setting.settingId):
				service.redress_storable_id(setting)
			return service.create(setting)
		else:
			# one setting per tenant, always update the existing one
			setting.settingId = existing.settingId
			setting.tenantId = existing.tenantId
			return service.update(setting)

	return trans(service, save_action)


@router.post('/publish/notification/setting/test', tags=[UserRole.ADMIN], response_model=None)
def test_publish_notification_setting(
		setting: PublishNotificationSetting,
		principal_service: PrincipalService = Depends(get_admin_principal)) -> dict:
	validate_publish_notification_setting(setting)
	try:
		send_publish_notification_test(setting)
		return {'success': True, 'message': 'Test message sent.'}
	except Exception as e:
		logger.warning(f'Failed to send publish notification test message: {e}', exc_info=True)
		return {'success': False, 'message': str(e)}
