from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict
from unittest import TestCase

from watchmen_data_kernel.common import DataKernelException
from watchmen_data_kernel.storage_bridge.utils import get_value_from, split_variable_segments


def ask_value(variables: Dict[str, Any], name: str) -> Any:
	return get_value_from(
		name, split_variable_segments(name),
		lambda x: variables.get(x), lambda names: False)


class SplitVariableSegmentsTest(TestCase):
	def test_split_without_parentheses(self):
		# exactly same as strip().split('.') when no parentheses given
		self.assertEqual(['a'], split_variable_segments('a'))
		self.assertEqual(['a', 'b', 'c'], split_variable_segments('a.b.c'))
		self.assertEqual(['a', 'b', 'c'], split_variable_segments(' a.b.c '))
		self.assertEqual(['a', ''], split_variable_segments('a.'))
		self.assertEqual([''], split_variable_segments(''))

	def test_split_with_parentheses(self):
		self.assertEqual(
			['rows', '&firstRow(amount:desc)', 'customerName'],
			split_variable_segments('rows.&firstRow(amount:desc).customerName'))
		# dots inside parentheses are ignored
		self.assertEqual(
			['rows', '&firstRow(address.city:desc,amount:asc)', 'customerName'],
			split_variable_segments('rows.&firstRow(address.city:desc,amount:asc).customerName'))


class FirstRowFunctionTest(TestCase):
	def test_single_key_asc(self):
		variables = {'rows': [{'amount': 3}, {'amount': 1}, {'amount': 2}]}
		self.assertEqual({'amount': 1}, ask_value(variables, 'rows.&firstRow(amount:asc)'))
		# direction is optional, asc as default
		self.assertEqual({'amount': 1}, ask_value(variables, 'rows.&firstRow(amount)'))

	def test_single_key_desc(self):
		variables = {'rows': [{'amount': 3}, {'amount': 1}, {'amount': 2}]}
		self.assertEqual({'amount': 3}, ask_value(variables, 'rows.&firstRow(amount:desc)'))

	def test_multiple_keys_mixed_direction(self):
		variables = {
			'rows': [
				{'amount': 1, 'createdTime': 3},
				{'amount': 2, 'createdTime': 1},
				{'amount': 1, 'createdTime': 2}
			]
		}
		self.assertEqual(
			{'amount': 1, 'createdTime': 3},
			ask_value(variables, 'rows.&firstRow(amount:asc,createdTime:desc)'))
		self.assertEqual(
			{'amount': 2, 'createdTime': 1},
			ask_value(variables, 'rows.&firstRow(amount:desc,createdTime:asc)'))

	def test_nested_field_path(self):
		variables = {
			'rows': [
				{'address': {'city': 'b'}},
				{'address': {'city': 'c'}},
				{'address': {'city': 'a'}}
			]
		}
		self.assertEqual({'address': {'city': 'a'}}, ask_value(variables, 'rows.&firstRow(address.city:asc)'))
		self.assertEqual({'address': {'city': 'c'}}, ask_value(variables, 'rows.&firstRow(address.city:desc)'))

	def test_none_value_always_last(self):
		variables = {'rows': [{'amount': None}, {'amount': 2}, {'amount': 1}]}
		self.assertEqual({'amount': 1}, ask_value(variables, 'rows.&firstRow(amount:asc)'))
		self.assertEqual({'amount': 2}, ask_value(variables, 'rows.&firstRow(amount:desc)'))

	def test_missing_sort_field_treated_as_none(self):
		variables = {'rows': [{'name': 'x'}, {'amount': 2}, {'amount': 1}]}
		self.assertEqual({'amount': 1}, ask_value(variables, 'rows.&firstRow(amount:asc)'))
		self.assertEqual({'amount': 2}, ask_value(variables, 'rows.&firstRow(amount:desc)'))

	def test_empty_list(self):
		self.assertIsNone(ask_value({'rows': []}, 'rows.&firstRow(amount:asc)'))

	def test_value_is_not_list(self):
		self.assertIsNone(ask_value({'rows': 'a string'}, 'rows.&firstRow(amount:asc)'))
		self.assertIsNone(ask_value({'rows': {'amount': 1}}, 'rows.&firstRow(amount:asc)'))

	def test_element_is_not_dict(self):
		self.assertIsNone(ask_value({'rows': [1, 2, 3]}, 'rows.&firstRow(amount:asc)'))
		self.assertIsNone(ask_value({'rows': [{'amount': 1}, 'x']}, 'rows.&firstRow(amount:asc)'))

	def test_decimal_detection_on_numeric_string(self):
		# numeric strings are detected as decimal, 9 is less than 10
		variables = {'rows': [{'amount': '10'}, {'amount': '9'}]}
		self.assertEqual({'amount': '9'}, ask_value(variables, 'rows.&firstRow(amount:asc)'))
		self.assertEqual({'amount': '10'}, ask_value(variables, 'rows.&firstRow(amount:desc)'))

	def test_mixed_decimal_types(self):
		variables = {'rows': [{'amount': 2}, {'amount': Decimal('1.5')}, {'amount': 1.6}]}
		self.assertEqual({'amount': Decimal('1.5')}, ask_value(variables, 'rows.&firstRow(amount:asc)'))

	def test_date_value(self):
		variables = {
			'rows': [
				{'createdDate': date(2024, 1, 2)},
				{'createdDate': date(2023, 5, 1)},
				{'createdDate': date(2024, 7, 8)}
			]
		}
		self.assertEqual(
			{'createdDate': date(2023, 5, 1)}, ask_value(variables, 'rows.&firstRow(createdDate:asc)'))
		self.assertEqual(
			{'createdDate': date(2024, 7, 8)}, ask_value(variables, 'rows.&firstRow(createdDate:desc)'))

	def test_mixed_date_and_datetime(self):
		variables = {
			'rows': [
				{'createdTime': datetime(2024, 1, 2, 10, 30, 0)},
				{'createdTime': date(2024, 1, 2)},
				{'createdTime': datetime(2024, 1, 1, 10, 30, 0)}
			]
		}
		self.assertEqual(
			{'createdTime': datetime(2024, 1, 1, 10, 30, 0)},
			ask_value(variables, 'rows.&firstRow(createdTime:asc)'))
		# date is normalized to datetime at midnight, less than datetime of same day
		self.assertEqual(
			{'createdTime': date(2024, 1, 2)},
			ask_value(variables, 'rows.&firstRow(createdTime:desc)'))

	def test_chain_continues_after_first_row(self):
		variables = {
			'rows': [
				{'amount': 3, 'customerName': 'c'},
				{'amount': 1, 'customerName': 'a'},
				{'amount': 2, 'customerName': 'b'}
			]
		}
		self.assertEqual('c', ask_value(variables, 'rows.&firstRow(amount:desc).customerName'))

	def test_chain_continues_to_nested_value(self):
		variables = {
			'rows': [
				{'amount': 1, 'address': {'city': 'x'}},
				{'amount': 2, 'address': {'city': 'y'}}
			]
		}
		self.assertEqual('y', ask_value(variables, 'rows.&firstRow(amount:desc).address.city'))

	def test_chain_ends_when_first_row_is_none(self):
		self.assertIsNone(ask_value({'rows': []}, 'rows.&firstRow(amount:asc).customerName'))

	def test_no_sort_key_declared(self):
		with self.assertRaises(DataKernelException):
			ask_value({'rows': [{'amount': 1}]}, 'rows.&firstRow()')
		with self.assertRaises(DataKernelException):
			ask_value({'rows': [{'amount': 1}]}, 'rows.&firstRow')

	def test_invalid_direction(self):
		with self.assertRaises(DataKernelException):
			ask_value({'rows': [{'amount': 1}]}, 'rows.&firstRow(amount:down)')
