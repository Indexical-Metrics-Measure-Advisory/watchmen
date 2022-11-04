from typing import Callable, Optional
from fastapi import APIRouter, Depends
from starlette.responses import Response

from watchmen_auth import PrincipalService

from watchmen_data_kernel.system import OperationScriptBuilder, PackageZipFile

from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator, \
	RecordOperationService, PackageVersionService

from watchmen_model.admin import UserRole

from watchmen_rest import get_any_admin_principal, get_admin_principal

from watchmen_rest_doll.util import trans

router = APIRouter()


def get_operation_service(principal_service: PrincipalService) -> RecordOperationService:
	return RecordOperationService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_package_version_service(operation_service: RecordOperationService) -> PackageVersionService:
	return PackageVersionService(operation_service.storage, operation_service.snowflakeGenerator, operation_service.principalService)


@router.get('/operation/script_package', tags=[UserRole.ADMIN])
async def build_package_script(principal_service: PrincipalService = Depends(get_any_admin_principal)):
	operation_service = get_operation_service(principal_service)
	action = ask_build_scripts_action(operation_service)
	package_zip = trans(operation_service, lambda: action())
	headers = {'Content-Disposition': f'attachment; filename="{package_zip.name}.zip"'}
	return Response(package_zip.content.getvalue(), headers=headers, media_type='application/x-zip-compressed')


def ask_build_scripts_action(operation_service: RecordOperationService) -> Callable[
	[], PackageZipFile]:
	def action() -> PackageZipFile:
		package_version_service = get_package_version_service(operation_service)
		builder = OperationScriptBuilder(operation_service)
		package_zip_file = builder.build_all().package_zip()
		package_version_service.increase_package_version()
		return package_zip_file
	
	return action


@router.get('/operation/clean', tags=[UserRole.ADMIN])
async def rebuild_operations(
		tuple_type: Optional[str],
		principal_service: PrincipalService = Depends(get_admin_principal)
):
	operation_service = get_operation_service(principal_service)
	action = ask_clean_operation_action(operation_service)
	return trans(operation_service, lambda: action(tuple_type))


def ask_clean_operation_action(
		operation_service: RecordOperationService) -> \
		Callable[[str], None]:
	def action(tuple_type: str):
		operation_service.clean_operations(tuple_type)
	return action
