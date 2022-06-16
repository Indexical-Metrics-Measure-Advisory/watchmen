from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_data_kernel.common import ask_date_formats
from watchmen_meta.admin import TopicSnapshotJobLockService, TopicSnapshotSchedulerService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import TopicSnapshotScheduler, TopicSnapshotSchedulerId, UserRole
from watchmen_pipeline_kernel.topic_snapshot import run_job
from watchmen_rest import get_any_admin_principal
from watchmen_rest.util import raise_400, raise_404, raise_500
from watchmen_rest.util.raise_http_exception import raise_406
from watchmen_utilities import is_blank, is_date

router = APIRouter()


def get_topic_snapshot_scheduler_service(principal_service: PrincipalService) -> TopicSnapshotSchedulerService:
	return TopicSnapshotSchedulerService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_lock_service(scheduler_service: TopicSnapshotSchedulerService) -> TopicSnapshotJobLockService:
	return TopicSnapshotJobLockService(
		scheduler_service.storage, scheduler_service.snowflakeGenerator, scheduler_service.principalService)


@router.get('/topic/snapshot/scheduler/adhoc', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_class=Response)
async def rerun_by_topic_data(
		scheduler_id: Optional[TopicSnapshotSchedulerId], process_date: Optional[str],
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> None:
	if is_blank(scheduler_id):
		raise_400('Scheduler id is required.')

	if is_blank(process_date):
		raise_400('Process date is required.')

	parsed, parsed_process_date = is_date(process_date, ask_date_formats())
	if not parsed:
		raise_400('Process date must be date.')

	scheduler_service = get_topic_snapshot_scheduler_service(principal_service)
	scheduler_service.begin_transaction()
	try:
		scheduler: Optional[TopicSnapshotScheduler] = scheduler_service.find_by_id(scheduler_id)
		if scheduler is None:
			raise_404(f'Scheduler[id={scheduler_id}] not found.')

		if principal_service.is_tenant_admin() and scheduler.tenantId != principal_service.get_tenant_id():
			raise_404(f'Scheduler[id={scheduler_id}] not found.')

		lock_service = get_lock_service(scheduler_service)
		lock = lock_service.find_by_scheduler_and_process_date(scheduler_id, scheduler.frequency, parsed_process_date)
		if lock is not None:
			raise_406(f'Scheduler[id={scheduler_id}, processDate={process_date}] run already.')
	except HTTPException as e:
		raise e
	except Exception as e:
		raise_500(e)
	finally:
		scheduler_service.close_transaction()

	run_job(scheduler_id, parsed_process_date)
