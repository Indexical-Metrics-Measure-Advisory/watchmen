from fastapi import APIRouter, Depends
from watchmen_auth import PrincipalService
from watchmen_indicator_surface.util import trans, trans_readonly
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_rest import get_any_principal

from watchmen_sensing.meta.sensor_service import SensorService
from watchmen_sensing.model.sensor import Sensor
from watchmen_sensing.sensor import registry

router = APIRouter()


def ask_sensor_service(principal_service: PrincipalService) -> SensorService:
	return SensorService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.get('/sensing/sensors', tags=['sensing'])
async def list_sensors(principal_service: PrincipalService = Depends(get_any_principal)):
	service = ask_sensor_service(principal_service)
	return trans_readonly(service, lambda: service.find_by_tenant(principal_service.get_tenant_id()))


@router.get('/sensing/sensors/types', tags=['sensing'])
async def list_sensor_types():
	"""List all registered sensor types (built-in + extension stubs)."""
	registry.load_builtin_sensors()
	return registry.all_sensor_types()


@router.post('/sensing/sensors', tags=['sensing'])
async def create_sensor(
		sensor: Sensor, principal_service: PrincipalService = Depends(get_any_principal)
):
	service = ask_sensor_service(principal_service)
	if sensor.sensorId is None:
		sensor.sensorId = str(service.snowflakeGenerator.next_id())
	sensor.tenantId = principal_service.get_tenant_id()
	return trans(service, lambda: service.create(sensor))


@router.post('/sensing/sensors/{sensor_id}/enable', tags=['sensing'])
async def enable_sensor(
		sensor_id: str, principal_service: PrincipalService = Depends(get_any_principal)
):
	service = ask_sensor_service(principal_service)
	trans(service, lambda: service.set_enabled(
		sensor_id, True, principal_service.get_tenant_id()))
	return {'sensorId': sensor_id, 'enabled': True}


@router.post('/sensing/sensors/{sensor_id}/disable', tags=['sensing'])
async def disable_sensor(
		sensor_id: str, principal_service: PrincipalService = Depends(get_any_principal)
):
	service = ask_sensor_service(principal_service)
	trans(service, lambda: service.set_enabled(
		sensor_id, False, principal_service.get_tenant_id()))
	return {'sensorId': sensor_id, 'enabled': False}
