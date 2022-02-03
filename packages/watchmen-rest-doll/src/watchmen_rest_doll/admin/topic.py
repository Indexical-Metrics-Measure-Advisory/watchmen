from fastapi import APIRouter

from watchmen_auth import PrincipalService
from watchmen_meta_service.admin import TopicService
from watchmen_rest_doll.doll import ask_meta_storage, ask_snowflake_generator

router = APIRouter()


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)
