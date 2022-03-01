from unittest import TestCase

from watchmen_auth import PrincipalService
from watchmen_inquiry_kernel.storage import SubjectDataService
from watchmen_model.admin import User, UserRole
from watchmen_model.common import Pageable, ParameterKind, TopicFactorParameter
from watchmen_model.console import Subject, SubjectDataset, SubjectDatasetColumn


def create_fake_principal_service() -> PrincipalService:
	return PrincipalService(User(userId='1', tenantId='1', name='imma-admin', role=UserRole.ADMIN))


class TestSubject(TestCase):
	def test_single_topic(self):
		subject = Subject(
			dataset=SubjectDataset(
				columns=[
					SubjectDatasetColumn(
						columnId='2',
						parameter=TopicFactorParameter(kind=ParameterKind.TOPIC, topicId='1', factorId='1'),
						alias='Column2')
				]
			)
		)
		data_service = SubjectDataService(subject, create_fake_principal_service())
		page = data_service.page(Pageable(pageNumber=1, pageSize=100))
		print(page)
