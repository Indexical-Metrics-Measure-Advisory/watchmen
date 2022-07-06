from typing import List, Optional

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_data_kernel.service import ask_topic_storage
from watchmen_model.admin import Factor, Topic, UserRole
from watchmen_model.common import DataSourceId
from watchmen_rest import get_any_principal
from watchmen_rest.util import raise_400
from watchmen_utilities import is_blank

router = APIRouter()


@router.get('/topic/synonym/factors', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=List[Factor])
async def load_topic_by_id(
		name: Optional[str] = None,
		data_source_id: Optional[DataSourceId] = None,
		principal_service: PrincipalService = Depends(get_any_principal)
) -> List[Factor]:
	if is_blank(name):
		raise_400('Topic name is required.')
	if is_blank(data_source_id):
		raise_400('Data source id is required.')

	fake_topic = Topic(name=name, dataSourceId=data_source_id)
	storage = ask_topic_storage(fake_topic, principal_service)
	return storage.ask_synonym_factors(name)