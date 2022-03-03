from unittest import TestCase

from watchmen_auth import PrincipalService
from watchmen_data_kernel.cache import CacheService
from watchmen_inquiry_kernel.storage import SubjectDataService
from watchmen_meta.admin import SpaceService, TopicService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.console import ConnectedSpaceService
from watchmen_meta.system import DataSourceService
from watchmen_model.admin import Factor, FactorType, Space, Topic, TopicKind, TopicType, User, UserRole
from watchmen_model.common import ComputedParameter, ConstantParameter, Pageable, ParameterComputeType, ParameterKind, \
	TopicFactorParameter
from watchmen_model.console import ConnectedSpace, Subject, SubjectDataset, SubjectDatasetColumn
from watchmen_model.system import DataSource, DataSourceType


# TRUNCATE TABLE data_sources
# TRUNCATE TABLE topics
# TRUNCATE TABLE connected_spaces
# TRUNCATE TABLE spaces

def create_fake_principal_service() -> PrincipalService:
	return PrincipalService(User(userId='1', tenantId='1', name='imma-admin', role=UserRole.ADMIN))


def get_data_source_service(principal_service: PrincipalService) -> DataSourceService:
	return DataSourceService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_connected_space_service(principal_service: PrincipalService) -> ConnectedSpaceService:
	return ConnectedSpaceService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_space_service(principal_service: PrincipalService) -> SpaceService:
	return SpaceService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


class TestSubject(TestCase):
	# noinspection PyMethodMayBeStatic
	def prepare_data(self):
		data_source = DataSource(
			dataSourceId='1', dataSourceCode='ds1', dataSourceType=DataSourceType.MYSQL,
			host='localhost', port='3306', username='watchmen', password='watchmen', name='watchmen',
			tenantId='1')
		data_source_service = get_data_source_service(create_fake_principal_service())
		data_source_service.begin_transaction()
		data_source_service.create(data_source)
		data_source_service.commit_transaction()
		CacheService.data_source().put(data_source)

		topic1 = Topic(
			topicId='1', name='topic1', type=TopicType.DISTINCT, kind=TopicKind.BUSINESS,
			factors=[
				Factor(factorId='1', name='topic1_id', type=FactorType.SEQUENCE)
			],
			dataSourceId=data_source.dataSourceId,
			tenantId='1')
		topic_service = get_topic_service(create_fake_principal_service())
		topic_service.begin_transaction()
		topic_service.create(topic1)
		topic_service.commit_transaction()
		CacheService.topic().put(topic1)

		space = Space(spaceId='1', name='Space1', topicIds=[topic1.topicId], tenantId='1')
		space_service = get_space_service(create_fake_principal_service())
		space_service.begin_transaction()
		space_service.create(space)
		space_service.commit_transaction()

		connected_space = ConnectedSpace(
			connectId='1', name='ConnectedSpace1',
			spaceId=space.spaceId, isTemplate=False,
			userId='1', tenantId='1')
		connected_space_service = get_connected_space_service(create_fake_principal_service())
		connected_space_service.begin_transaction()
		connected_space_service.create(connected_space)
		connected_space_service.commit_transaction()

	def test_single_topic(self):
		self.prepare_data()

		subject = Subject(
			dataset=SubjectDataset(
				columns=[
					SubjectDatasetColumn(
						columnId='1',
						parameter=ComputedParameter(
							kind=ParameterKind.COMPUTED, type=ParameterComputeType.ADD,
							parameters=[
								TopicFactorParameter(kind=ParameterKind.TOPIC, topicId='1', factorId='1'),
								ConstantParameter(kind=ParameterKind.CONSTANT, value='2')
							]
						),
						alias='Column1'
					),
					SubjectDatasetColumn(
						columnId='2',
						parameter=TopicFactorParameter(kind=ParameterKind.TOPIC, topicId='1', factorId='1'),
						alias='Column2'),
					SubjectDatasetColumn(
						columnId='3',
						parameter=ConstantParameter(kind=ParameterKind.CONSTANT, value='{&now}'),
						alias='Column3'),
					SubjectDatasetColumn(
						columnId='4',
						parameter=ConstantParameter(kind=ParameterKind.CONSTANT, value='HELLO WORLD!'),
						alias='Column4'),
					SubjectDatasetColumn(
						columnId='5',
						parameter=ComputedParameter(
							kind=ParameterKind.COMPUTED, type=ParameterComputeType.ADD,
							parameters=[
								ConstantParameter(kind=ParameterKind.CONSTANT, value='201'),
								ConstantParameter(kind=ParameterKind.CONSTANT, value='102')
							]
						),
						alias='Column5'
					),
					SubjectDatasetColumn(
						columnId='6',
						parameter=ComputedParameter(
							kind=ParameterKind.COMPUTED, type=ParameterComputeType.YEAR_OF,
							parameters=[
								ConstantParameter(kind=ParameterKind.CONSTANT, value='2022/03/03'),
							]
						),
						alias='Column6'
					)
				]
			),
			connectId='1',
			userId='1', tenantId='1'
		)
		data_service = SubjectDataService(subject, create_fake_principal_service())
		page = data_service.page(Pageable(pageNumber=1, pageSize=100))
		print(page)
