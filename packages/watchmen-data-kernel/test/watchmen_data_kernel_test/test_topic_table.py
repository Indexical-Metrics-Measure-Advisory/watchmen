from unittest import TestCase

from watchmen_auth import PrincipalService
from watchmen_data_kernel.cache import CacheService
from watchmen_data_kernel.service.topic_structure_helper import create_topic_structure, drop_topic_structure
from watchmen_model.admin import Factor, FactorType, Topic, TopicKind, TopicType, User, UserRole
from watchmen_model.system import DataSource, DataSourceType


def create_fake_principal_service() -> PrincipalService:
	return PrincipalService(User(userId='1', tenantId='1', name='imma-admin', role=UserRole.ADMIN))


def prepare_topic():
	data_source = DataSource(
		dataSourceId='1', dataSourceCode='ds1', dataSourceType=DataSourceType.MYSQL,
		host='localhost', port='3306', username='watchmen', password='watchmen', name='watchmen',
		tenantId='1')
	CacheService.data_source().put(data_source)

	return Topic(
		topicId='1', name='topic_x', type=TopicType.DISTINCT, kind=TopicKind.BUSINESS,
		factors=[
			Factor(factorId='1', name='topic1_id', type=FactorType.SEQUENCE, indexGroup='u-1'),
			Factor(factorId='2', name='topic1_text', type=FactorType.TEXT, precision='64', indexGroup='u-1')
		],
		dataSourceId=data_source.dataSourceId,
		tenantId='1')


class TopicTable(TestCase):
	# noinspection PyMethodMayBeStatic
	def test_create_topic(self):
		create_topic_structure(prepare_topic(), create_fake_principal_service())

	# noinspection PyMethodMayBeStatic
	def test_drop_topic(self):
		drop_topic_structure(prepare_topic(), create_fake_principal_service())
