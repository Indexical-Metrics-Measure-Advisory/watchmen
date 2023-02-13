from typing import Callable, Optional

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import IntegratedRecord
from watchmen_collector_kernel.storage import get_integrated_record_service, IntegratedRecordService
from watchmen_meta.common import ask_snowflake_generator, ask_meta_storage
from watchmen_model.admin import UserRole
from watchmen_rest import get_any_admin_principal
from watchmen_rest.util import validate_tenant_id, raise_403

router = APIRouter()


@router.post('/integrated/record', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=IntegratedRecord)
async def save_integrated_record(
		record: IntegratedRecord, principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> IntegratedRecord:
	validate_tenant_id(record, principal_service)
	integrated_record_service = get_integrated_record_service(ask_meta_storage(),
	                                                          ask_snowflake_generator(),
	                                                          principal_service)
	action = ask_save_integrated_record_action(integrated_record_service, principal_service)
	return action(record)


# noinspection PyUnusedLocal
def ask_save_integrated_record_action(
		integrated_record_service: IntegratedRecordService, principal_service: PrincipalService
) -> Callable[[IntegratedRecord], IntegratedRecord]:
	def action(record: IntegratedRecord) -> IntegratedRecord:
		if integrated_record_service.is_storable_id_faked(record.integratedRecordId):
			integrated_record_service.redress_storable_id(record)
			# noinspection PyTypeChecker
			integrated_record: IntegratedRecord = integrated_record_service.create_integrated_record(record)
		else:
			# noinspection PyTypeChecker
			existing_integrated_record: Optional[IntegratedRecord] = integrated_record_service.find_by_id(
				record.integratedRecordId)
			if existing_integrated_record is not None:
				if existing_integrated_record.tenantId != record.tenantId:
					raise_403()
			# noinspection PyTypeChecker
			integrated_record: IntegratedRecord = integrated_record_service.update_integrated_record(record)

		return integrated_record

	return action
