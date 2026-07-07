import yaml
from typing import List, Optional

from fastapi import APIRouter, Depends, Request
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_model.admin import Topic, UserRole
from watchmen_model.common import TenantId, TopicId
from watchmen_rest import get_admin_principal, get_console_principal
from watchmen_rest.util import raise_400, raise_403, raise_404, validate_tenant_id
from watchmen_rest_doll.util import trans_readonly, trans_with_tail
from watchmen_utilities import ArrayHelper, is_blank

from .topic_common import (
	ensure_design_environment_for_yaml_update,
	get_topic_service,
	is_system_topic,
	ask_save_topic_action,
)

router = APIRouter()


@router.get('/topic/yaml', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_class=Response)
async def load_topic_yaml_by_id(
		topic_id: Optional[TopicId] = None, principal_service: PrincipalService = Depends(get_console_principal)
) -> Response:
	if is_blank(topic_id):
		raise_400('Topic id is required.')

	topic_service = get_topic_service(principal_service)

	def action() -> Topic:
		# noinspection PyTypeChecker
		topic: Topic = topic_service.find_by_id(topic_id)
		if topic is None:
			raise_404()
		# tenant id must match current principal's
		if topic.tenantId != principal_service.get_tenant_id():
			raise_404()
		if is_system_topic(topic):
			raise_404()
		return topic

	topic = trans_readonly(topic_service, action)
	yaml_str = yaml.dump(topic.model_dump(mode='json', by_alias=True, exclude_none=True), sort_keys=False)
	return Response(content=yaml_str, media_type="application/x-yaml")


@router.post('/topic/yaml', tags=[UserRole.ADMIN], response_class=Response)
async def save_topic_yaml(
		request: Request, principal_service: PrincipalService = Depends(get_admin_principal)
) -> Response:
	ensure_design_environment_for_yaml_update()
	yaml_bytes = await request.body()
	yaml_str = yaml_bytes.decode('utf-8')
	try:
		topic_dict = yaml.safe_load(yaml_str)
		topic = Topic.model_validate(topic_dict)
	except Exception as e:
		raise_400(f'Invalid YAML: {str(e)}')

	validate_tenant_id(topic, principal_service)
	if is_system_topic(topic):
		raise_400('System topics cannot be saved via YAML.')
	topic_service = get_topic_service(principal_service)
	action = ask_save_topic_action(topic_service, principal_service, True)
	saved_topic = trans_with_tail(topic_service, lambda: action(topic))

	saved_yaml_str = yaml.dump(saved_topic.model_dump(mode='json', by_alias=True, exclude_none=True), sort_keys=False)
	return Response(content=saved_yaml_str, media_type="application/x-yaml")


@router.get('/topic/all/yaml', tags=[UserRole.ADMIN], response_class=Response)
async def find_all_topics_yaml(principal_service: PrincipalService = Depends(get_admin_principal)) -> Response:
	tenant_id = principal_service.get_tenant_id()
	topic_service = get_topic_service(principal_service)

	def action() -> List[Topic]:
		topics = topic_service.find_all(tenant_id)
		return ArrayHelper(topics).filter(lambda x: not is_system_topic(x)).to_list()

	topics = trans_readonly(topic_service, action)
	yaml_str = yaml.dump([t.model_dump(mode='json', by_alias=True, exclude_none=True) for t in topics], sort_keys=False)
	return Response(content=yaml_str, media_type="application/x-yaml")
