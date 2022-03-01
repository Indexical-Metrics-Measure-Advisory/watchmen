from unittest import TestCase

from watchmen_auth import PrincipalService
from watchmen_data_kernel.cache import CacheService
from watchmen_inquiry_kernel.storage import SubjectDataService
from watchmen_model.admin import Factor, FactorType, Topic, TopicType, User, UserRole
from watchmen_model.common import Pageable, ParameterKind, TopicFactorParameter
from watchmen_model.console import Subject, SubjectDataset, SubjectDatasetColumn
from watchmen_model.system import DataSource, DataSourceType


def create_fake_principal_service() -> PrincipalService:
	return PrincipalService(User(userId='1', tenantId='1', name='imma-admin', role=UserRole.ADMIN))


class TestSubject(TestCase):
	# noinspection PyMethodMayBeStatic
	def create_data_sources(self) -> None:
		data_source = DataSource(
			dataSourceId='1', dataSourceCode='ds1', dataSourceType=DataSourceType.MYSQL,
			host='localhost', port='3306', username='watchmen', password='watchmen', name='watchmen',
			tenantId='1')
		CacheService.data_source().put(data_source)

	# noinspection PyMethodMayBeStatic
	def create_topics(self) -> None:
		topic1 = Topic(
			topicId='1', name='topic1', type=TopicType.DISTINCT,
			factors=[
				Factor(factorId='1', name='topic1_id', type=FactorType.SEQUENCE)
			],
			dataSourceId='1',
			tenantId='1')
		CacheService.topic().put(topic1)

	def test_single_topic(self):
		self.create_data_sources()
		self.create_topics()

		subject = Subject(
			dataset=SubjectDataset(
				columns=[
					SubjectDatasetColumn(
						columnId='2',
						parameter=TopicFactorParameter(kind=ParameterKind.TOPIC, topicId='1', factorId='1'),
						alias='Column2')
				]
			),
			tenantId='1'
		)
		data_service = SubjectDataService(subject, create_fake_principal_service())
		page = data_service.page(Pageable(pageNumber=1, pageSize=100))
		print(page)
