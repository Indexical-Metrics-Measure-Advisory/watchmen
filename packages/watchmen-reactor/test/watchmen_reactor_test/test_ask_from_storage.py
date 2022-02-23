from unittest import TestCase

from watchmen_auth import PrincipalService
from watchmen_model.admin import User, UserRole
from watchmen_model.common import ParameterJoint, ParameterJointType
from watchmen_reactor.pipeline.runtime import parse_condition_for_storage


def create_fake_principal_service() -> PrincipalService:
	return PrincipalService(User(userId='1', tenantId='1', name='imma-admin', role=UserRole.ADMIN))


class AskFromStorage(TestCase):
	# noinspection PyMethodMayBeStatic
	def test_no_filter_joint(self):
		joint = ParameterJoint(jointType=ParameterJointType.AND)
		parsed_joint = parse_condition_for_storage(joint, [], create_fake_principal_service(), True)
		print(parsed_joint)


