from datetime import date, datetime, time
from typing import Any, Dict, Optional
from unittest import TestCase

from watchmen_auth import PrincipalService
from watchmen_data_kernel.common import DataKernelException
from watchmen_data_kernel.storage_bridge.ask_from_memory import parse_parameter_in_memory
from watchmen_data_kernel.storage_bridge.variables import PipelineVariables
from watchmen_model.admin import User, UserRole
from watchmen_model.common import ConstantParameter


def create_fake_principal_service() -> PrincipalService:
	return PrincipalService(User(userId='1', tenantId='1', name='imma-admin', role=UserRole.ADMIN))


def create_variables(
		current_data: Optional[Dict[str, Any]] = None, variables: Optional[Dict[str, Any]] = None
) -> PipelineVariables:
	pipeline_variables = PipelineVariables(None, current_data if current_data is not None else {}, None)
	if variables is not None:
		for name, value in variables.items():
			pipeline_variables.put(name, value)
	return pipeline_variables


def run_constant(constant: str, variables: PipelineVariables) -> Any:
	principal_service = create_fake_principal_service()
	parsed = parse_parameter_in_memory(ConstantParameter(value=constant), principal_service)
	return parsed.value(variables, principal_service)


class CombineDateTimeTest(TestCase):
	def test_literal_and_literal(self):
		self.assertEqual(
			datetime(2024, 3, 21, 18, 30, 0),
			run_constant('{&combineDateTime(2024-03-21, 18:30:00)}', create_variables()))
		# time without seconds
		self.assertEqual(
			datetime(2024, 3, 21, 18, 30, 0),
			run_constant('{&combineDateTime(2024-03-21, 18:30)}', create_variables()))
		# sql-style literals
		self.assertEqual(
			datetime(2024, 3, 21, 9, 12, 23),
			run_constant("{&combineDateTime(date'2024-03-21', time'09:12:23')}", create_variables()))

	def test_variable_chain_parameters(self):
		variables = create_variables(
			current_data={'orderDate': date(2024, 3, 21), 'shiftStart': time(18, 30, 0)})
		self.assertEqual(
			datetime(2024, 3, 21, 18, 30, 0),
			run_constant('{&combineDateTime(orderDate, shiftStart)}', variables))
		# nested variable chain
		variables = create_variables(variables={'workVar': {'shiftStart': '09:12:23'}})
		self.assertEqual(
			datetime(2024, 3, 21, 9, 12, 23),
			run_constant('{&combineDateTime(2024-03-21, workVar.shiftStart)}', variables))

	def test_user_real_data_shape(self):
		variables = create_variables(
			current_data={'modifydate': "date'2024-03-21'", 'modifytime': '09:12:23'})
		self.assertEqual(
			datetime(2024, 3, 21, 9, 12, 23),
			run_constant('{&combineDateTime(modifydate, modifytime)}', variables))

	def test_now_as_date_parameter(self):
		result = run_constant('{&combineDateTime(&now, 08:00:00)}', create_variables())
		self.assertEqual(datetime.now().date(), result.date())
		self.assertEqual(time(8, 0, 0), result.time())
		self.assertEqual(0, result.microsecond)

	def test_datetime_input_takes_date_part(self):
		variables = create_variables(
			current_data={'eventTime': datetime(2024, 3, 21, 15, 45, 30, 123456)})
		result = run_constant('{&combineDateTime(eventTime, 08:00:00)}', variables)
		self.assertEqual(datetime(2024, 3, 21, 8, 0, 0), result)
		# microsecond is truncated
		self.assertEqual(0, result.microsecond)

	def test_datetime_as_time_parameter(self):
		variables = create_variables(current_data={'eventTime': datetime(2024, 3, 21, 15, 45, 30)})
		self.assertEqual(
			datetime(2024, 3, 21, 15, 45, 30),
			run_constant('{&combineDateTime(2024-03-21, eventTime)}', variables))

	def test_time_without_separator(self):
		self.assertEqual(
			datetime(2024, 3, 21, 18, 30, 0),
			run_constant('{&combineDateTime(2024-03-21, 183000)}', create_variables()))

	def test_invalid_date_parameter(self):
		variables = create_variables(current_data={'notADate': 'not a date'})
		with self.assertRaises(DataKernelException):
			run_constant('{&combineDateTime(notADate, 18:30:00)}', variables)

	def test_invalid_time_parameter(self):
		variables = create_variables(current_data={'notATime': 'not a time'})
		with self.assertRaises(DataKernelException):
			run_constant('{&combineDateTime(2024-03-21, notATime)}', variables)
