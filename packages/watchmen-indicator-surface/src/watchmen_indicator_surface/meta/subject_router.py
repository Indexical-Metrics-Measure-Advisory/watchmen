from typing import Dict, List, Optional

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.common import IndicatorKernelException
from watchmen_indicator_surface.util import trans_readonly
from watchmen_meta.admin import SpaceService, TopicService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.console import ConnectedSpaceService, SubjectService
from watchmen_model.admin import Space, Topic, UserRole
from watchmen_model.common import ConnectedSpaceId, SpaceId, SubjectId, TopicId
from watchmen_model.console import ConnectedSpace, Subject
from watchmen_rest import get_console_principal
from watchmen_rest.util import raise_400, raise_403, raise_404
from watchmen_utilities import ArrayHelper, is_blank

router = APIRouter()


def get_subject_service(principal_service: PrincipalService) -> SubjectService:
	return SubjectService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_connected_space_service(subject_service: SubjectService) -> ConnectedSpaceService:
	return ConnectedSpaceService(
		subject_service.storage, subject_service.snowflakeGenerator, subject_service.principalService)


def get_space_service(subject_service: SubjectService) -> SpaceService:
	return SpaceService(subject_service.storage, subject_service.snowflakeGenerator, subject_service.principalService)


def get_topic_service(subject_service: SubjectService) -> TopicService:
	return TopicService(subject_service.storage, subject_service.snowflakeGenerator, subject_service.principalService)


class SubjectForIndicator(Subject):
	topics: List[Topic]


@router.get(
	'/indicator/subject/name', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=List[SubjectForIndicator])
def find_subjects_for_indicator(
		query_name: Optional[str], principal_service: PrincipalService = Depends(get_console_principal)
) -> List[SubjectForIndicator]:
	subject_service = get_subject_service(principal_service)

	def action() -> List[SubjectForIndicator]:
		if is_blank(query_name):
			subjects = subject_service.find_by_text(None, principal_service.get_tenant_id())
		else:
			subjects = subject_service.find_by_text(query_name, principal_service.get_tenant_id())
		connected_space_service = get_connected_space_service(subject_service)
		connect_ids = ArrayHelper(subjects).map(lambda x: x.connectId).distinct().to_list()
		connected_spaces = connected_space_service.find_templates_by_ids(
			connect_ids, None, principal_service.get_tenant_id())
		connect_ids = ArrayHelper(connected_spaces).map(lambda x: x.connectId).to_list()
		connected_space_map: Dict[ConnectedSpaceId, ConnectedSpace] = ArrayHelper(connected_spaces) \
			.to_map(lambda x: x.connectId, lambda x: x)
		subjects = ArrayHelper(subjects).filter(lambda x: x.connectId in connect_ids).to_list()
		space_ids = ArrayHelper(connected_spaces).map(lambda x: x.spaceId).distinct().to_list()
		space_service = get_space_service(subject_service)
		spaces = space_service.find_by_ids(space_ids, principal_service.get_tenant_id())
		space_map: Dict[SpaceId, Space] = ArrayHelper(spaces).to_map(lambda x: x.spaceId, lambda x: x)
		topic_ids = ArrayHelper(spaces).map(lambda x: x.topicIds).flatten().distinct().to_list()
		topic_service = get_topic_service(subject_service)
		topics = topic_service.find_by_ids(topic_ids, principal_service.get_tenant_id())
		topic_map: Dict[TopicId, Topic] = ArrayHelper(topics).to_map(lambda x: x.topicId, lambda x: x)

		def link_topics(subject: Subject) -> SubjectForIndicator:
			connect_id = subject.connectId
			connected_space = connected_space_map[connect_id]
			space_id = connected_space.spaceId
			space = space_map[space_id]
			all_topic_ids = space.topicIds
			all_topics = ArrayHelper(all_topic_ids).map(lambda x: topic_map[x]).to_list()
			return SubjectForIndicator(
				**subject.to_dict(),
				topics=all_topics
			)

		return ArrayHelper(subjects).map(link_topics).to_list()

	return trans_readonly(subject_service, action)


@router.get('/indicator/subject', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=SubjectForIndicator)
def find_subject_for_indicator(
		subject_id: Optional[SubjectId], principal_service: PrincipalService = Depends(get_console_principal)
) -> SubjectForIndicator:
	if is_blank(subject_id):
		raise_400('Subject id is required.')

	subject_service = get_subject_service(principal_service)

	def action() -> SubjectForIndicator:
		subject: Optional[Subject] = subject_service.find_by_id(subject_id)
		if subject is None:
			raise_404()
		if subject.tenantId != principal_service.get_tenant_id():
			raise_403()
		connected_space_service = get_connected_space_service(subject_service)
		connected_space: Optional[ConnectedSpace] = connected_space_service.find_by_id(subject.connectId)
		if connected_space is None:
			raise IndicatorKernelException(f'Connected space not found for subject[id={subject_id}].')
		space_service = get_space_service(subject_service)
		space: Optional[Space] = space_service.find_by_id(connected_space.spaceId)
		if space is None:
			raise IndicatorKernelException(f'Space not found for subject[id={subject_id}].')
		topic_service = get_topic_service(subject_service)
		topics = topic_service.find_by_ids(space.topicIds, principal_service.get_tenant_id())
		topic_map: Dict[TopicId, Topic] = ArrayHelper(topics).to_map(lambda x: x.topicId, lambda x: x)

		all_topic_ids = space.topicIds
		all_topics = ArrayHelper(all_topic_ids).map(lambda x: topic_map[x]).to_list()
		return SubjectForIndicator(
			**subject.to_dict(),
			topics=all_topics
		)

	return trans_readonly(subject_service, action)
