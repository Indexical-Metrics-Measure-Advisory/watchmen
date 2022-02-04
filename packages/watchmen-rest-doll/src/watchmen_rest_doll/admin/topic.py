from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from watchmen_auth import PrincipalService
from watchmen_meta_service.admin import TopicService
from watchmen_model.admin import Topic, UserRole
from watchmen_model.common import TopicId
from watchmen_rest.util import raise_400, raise_403, raise_404, raise_500
from watchmen_rest_doll.auth import get_admin_principal, get_console_principal
from watchmen_rest_doll.doll import ask_meta_storage, ask_snowflake_generator
from watchmen_rest_doll.util import is_blank, validate_tenant_id

router = APIRouter()


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.get('/topic', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=Topic)
async def load_topic_by_id(
		topic_id: Optional[TopicId] = None, principal_service: PrincipalService = Depends(get_console_principal)
) -> Optional[Topic]:
	if is_blank(topic_id):
		raise_400('Topic id is required.')

	topic_service = get_topic_service(principal_service)
	topic_service.begin_transaction()
	try:
		# noinspection PyTypeChecker
		topic: Topic = topic_service.find_by_id(topic_id)
		if topic is None:
			raise_404()
		# tenant id must match current principal's
		if topic.tenantId != principal_service.get_tenant_id():
			raise_404()
		return topic
	except HTTPException as e:
		raise e
	except Exception as e:
		raise_500(e)
	finally:
		topic_service.close_transaction()


@router.post("/topic", tags=[UserRole.ADMIN], response_model=Topic)
async def save_enum(
		topic: Topic, principal_service: PrincipalService = Depends(get_admin_principal)
) -> Topic:
	validate_tenant_id(topic, principal_service)

	topic_service = get_topic_service(principal_service)

	if topic_service.is_tuple_id_faked(topic.topicId):
		topic_service.begin_transaction()
		try:
			topic_service.redress_tuple_id(topic)
			if topic.items is None:
				topic.items = []
			# noinspection PyTypeChecker
			topic: Topic = topic_service.create(topic)
			topic_service.commit_transaction()
		except Exception as e:
			topic_service.rollback_transaction()
			raise_500(e)
	else:
		topic_service.begin_transaction()
		try:
			# noinspection PyTypeChecker
			existing_topic: Optional[Topic] = topic_service.find_by_id(topic.topicId)
			if existing_topic is not None:
				if existing_topic.tenantId != topic.tenantId:
					raise_403()

			topic_service.commit_transaction()
		except HTTPException as e:
			topic_service.rollback_transaction()
			raise e
		except Exception as e:
			topic_service.rollback_transaction()
			raise_500(e)

	return topic

# @router.post("/topic", tags=["admin"], response_model=Topic)
# async def create_topic(topic: Topic, current_user: User = Depends(deps.get_current_user)):
#     topic = add_tenant_id_to_model(topic, current_user)
#     topic.createTime = datetime.now().replace(tzinfo=None).isoformat()
#     return create_topic_schema(topic)
# @router.post("/save/topic", tags=["admin"], response_model=Topic)
# async def save_topic(topic: Topic, current_user: User = Depends(deps.get_current_user)):
#     topic = add_tenant_id_to_model(topic, current_user)
#     if topic.topicId is None or check_fake_id(topic.topicId):
#         result = create_topic_schema(topic)
#         create_or_update_presto_schema_fields(result)
#         return result
#     else:
#         topic = Topic.parse_obj(topic)
#         data = update_topic_schema(topic.topicId, topic)
#         create_or_update_presto_schema_fields(data)
#         return data
# @router.post("/update/topic", tags=["admin"], response_model=Topic)
# async def update_topic(topic_id, topic: Topic = Body(...), current_user: User = Depends(deps.get_current_user)):
#     topic = Topic.parse_obj(topic)
#     topic = add_tenant_id_to_model(topic, current_user)
#     data = update_topic_schema(topic_id, topic)
#     create_or_update_presto_schema_fields(data)
#     return data
# @router.post("/topic/name", tags=["admin"], response_model=DataPage)
# async def query_topic_list_by_name(query_name: str, pagination: Pagination = Body(...),
#                                    current_user: User = Depends(deps.get_current_user)):
#     result = query_topic_list_with_pagination(query_name, pagination, current_user)
#     # merge_summary_data_for_topic(result,current_user)
#     return result
# @router.get("/topic/query", tags=["admin"], response_model=List[Topic])
# async def load_topic_list_by_name_without_page(query_name, current_user: User = Depends(deps.get_current_user)):
#     return load_topic_list_by_name(query_name, current_user)
# @router.post("/topic/list/name", tags=["admin"], response_model=List[Topic])
# async def load_topic_list_by_name_list(name_list: List[str], current_user: User = Depends(deps.get_current_user)) -> \
#         List[Topic]:
#     results = []
#     for name in name_list:
#         results.append(load_topic_by_name(name, current_user))
#     return results
# @router.get("/topic/name/tenant", tags=["admin"], response_model=Topic)
# async def load_topic_by_name_and_tenant(name: str, tenant_id: str, current_user: User = Depends(deps.get_current_user)):
#     return get_topic_by_name_and_tenant_id(name, tenant_id)
