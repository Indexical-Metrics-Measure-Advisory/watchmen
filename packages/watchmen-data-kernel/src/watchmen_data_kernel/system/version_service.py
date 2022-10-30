
from watchmen_meta.system import VersionService as VersionStorageService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator, ask_default_version

from watchmen_auth import PrincipalService


def get_current_version(principal_service: PrincipalService) -> str:
	version = get_version_service(principal_service).find_by_tenant()
	if version is None:
		current_version = ask_default_version()
	else:
		current_version = version.currVersion
	return current_version


def get_previous_version(principal_service: PrincipalService) -> str:
	version = get_version_service(principal_service).find_by_tenant()
	if version is None:
		previous_version = ask_default_version()
	else:
		previous_version = version.preVersion
	return previous_version


def get_version_service(principal_service: PrincipalService) -> VersionStorageService:
	return VersionStorageService(ask_meta_storage(), ask_snowflake_generator(), principal_service)