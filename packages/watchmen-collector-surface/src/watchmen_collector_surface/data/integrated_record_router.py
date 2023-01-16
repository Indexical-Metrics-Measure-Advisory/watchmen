from typing import Callable, Optional

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import CollectorIntegratedRecord
from watchmen_collector_kernel.service import CollectorIntegratedRecordService
from watchmen_meta.common import ask_snowflake_generator, ask_meta_storage
from watchmen_model.admin import UserRole
from watchmen_rest import get_any_admin_principal
from watchmen_rest.util import validate_tenant_id, raise_403
from watchmen_rest_doll.util import trans

router = APIRouter()


def get_integrated_record_service(principal_service: PrincipalService) -> CollectorIntegratedRecordService:
	return CollectorIntegratedRecordService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.post('/integrated/record', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=CollectorIntegratedRecord)
async def save_integrated_record(
		record: CollectorIntegratedRecord, principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> CollectorIntegratedRecord:
	validate_tenant_id(record, principal_service)
	integrated_record_service = get_integrated_record_service(principal_service)
	action = ask_save_integrated_record_action(integrated_record_service, principal_service)
	return trans(integrated_record_service, lambda: action(record))


# noinspection PyUnusedLocal
def ask_save_integrated_record_action(
		integrated_record_service: CollectorIntegratedRecordService, principal_service: PrincipalService
) -> Callable[[CollectorIntegratedRecord], CollectorIntegratedRecord]:
	def action(record: CollectorIntegratedRecord) -> CollectorIntegratedRecord:
		if integrated_record_service.is_storable_id_faked(record.integratedRecordId):
			integrated_record_service.redress_storable_id(record)
			# noinspection PyTypeChecker
			integrated_record: CollectorIntegratedRecord = integrated_record_service.create(record)
		else:
			# noinspection PyTypeChecker
			existing_integrated_record: Optional[CollectorIntegratedRecord] = integrated_record_service.find_by_id(
				record.integratedRecordId)
			if existing_integrated_record is not None:
				if existing_integrated_record.tenantId != record.tenantId:
					raise_403()
			# noinspection PyTypeChecker
			integrated_record: CollectorIntegratedRecord = integrated_record_service.update(record)

		return integrated_record

	return action
