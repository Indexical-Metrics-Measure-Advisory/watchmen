from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_rest import get_any_principal

from watchmen_sensing.adapter import AdapterBundle
from watchmen_sensing.meta.action_record_service import ActionRecordService
from watchmen_sensing.meta.sensor_service import SensorService
from watchmen_sensing.meta.signal_service import SignalService
from watchmen_sensing.model.signal import SignalCategory
from watchmen_sensing.service.sensing_service import SensingService
from watchmen_sensing.settings import ask_sensing_autonomous_level

router = APIRouter()


def ask_sensing_service(principal_service: PrincipalService) -> SensingService:
	sensor_service = SensorService(ask_meta_storage(), ask_snowflake_generator(), principal_service)
	signal_service = SignalService(ask_meta_storage(), ask_snowflake_generator(), principal_service)
	action_record_service = ActionRecordService(
		ask_meta_storage(), ask_snowflake_generator(), principal_service)
	adapters = AdapterBundle(principal_service)
	return SensingService(
		sensor_service=sensor_service, signal_service=signal_service,
		action_record_service=action_record_service, adapters=adapters,
		principal_service=principal_service,
		autonomous_level_cap=ask_sensing_autonomous_level())


class RunCycleRequest(BaseModel):
	category: Optional[str] = None


class RunSensorRequest(BaseModel):
	config: Optional[dict] = None


@router.post('/sensing/run', tags=['sensing'])
async def run_cycle(
		body: RunCycleRequest, principal_service: PrincipalService = Depends(get_any_principal)
):
	service = ask_sensing_service(principal_service)
	category = None
	if body.category:
		try:
			category = SignalCategory(body.category)
		except ValueError:
			category = None
	return await service.run_cycle(category)


@router.post('/sensing/run/{sensor_type}', tags=['sensing'])
async def run_sensor(
		sensor_type: str, body: RunSensorRequest,
		principal_service: PrincipalService = Depends(get_any_principal)
):
	service = ask_sensing_service(principal_service)
	return await service.run_sensor(sensor_type, body.config)
