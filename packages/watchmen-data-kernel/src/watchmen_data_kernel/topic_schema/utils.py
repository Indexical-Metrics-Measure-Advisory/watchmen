from __future__ import annotations

from datetime import date, datetime, time
from decimal import Decimal
from typing import Any

from watchmen_data_kernel.common import ask_all_date_formats, ask_full_datetime_formats, ask_time_formats, \
	DataKernelException
from watchmen_model.admin import Factor, FactorType
from watchmen_utilities import is_date, is_decimal, is_time


def cast_value_for_factor(value: Any, factor: Factor) -> Any:
	if value is None:
		return None

	factor_type = factor.type
	if factor_type in [
		FactorType.SEQUENCE, FactorType.NUMBER, FactorType.UNSIGNED, FactorType.FLOOR, FactorType.RESIDENTIAL_AREA,
		FactorType.AGE, FactorType.BIZ_SCALE
	]:
		parsed, decimal_value = is_decimal(value)
		if parsed:
			return decimal_value
		else:
			raise DataKernelException(
				f'Value[{value}] is incompatible with factor[name={factor.name}, type={factor_type}].')
	elif factor_type == FactorType.TEXT:
		if isinstance(value, str):
			return value
		elif isinstance(value, (int, float, Decimal, bool, date, time)):
			return str(value)
		else:
			raise DataKernelException(
				f'Value[{value}, type={type(value)}] is incompatible with '
				f'factor[name={factor.name}, type={factor_type}].')
	elif factor_type in [
		FactorType.ADDRESS, FactorType.ROAD, FactorType.COMMUNITY, FactorType.EMAIL, FactorType.PHONE,
		FactorType.MOBILE, FactorType.FAX, FactorType.OCCUPATION, FactorType.ID_NO
	]:
		if isinstance(value, str):
			return value
		elif isinstance(value, (int, float, Decimal)):
			return str(value)
		else:
			raise DataKernelException(
				f'Value[{value}, type={type(value)}] is incompatible with '
				f'factor[name={factor.name}, type={factor_type}].')
	# noinspection PyPep8
	elif factor_type in [
		FactorType.CONTINENT, FactorType.REGION, FactorType.COUNTRY, FactorType.PROVINCE, FactorType.CITY,
		FactorType.DISTRICT, FactorType.RESIDENCE_TYPE, FactorType.GENDER, FactorType.RELIGION, FactorType.NATIONALITY,
		FactorType.BIZ_TRADE, FactorType.ENUM
	]:
		if isinstance(value, str):
			return value
		elif isinstance(value, (int, Decimal)):
			return str(value)
		else:
			raise DataKernelException(
				f'Value[{value}, type={type(value)}] is incompatible with '
				f'factor[name={factor.name}, type={factor_type}].')
	elif factor_type == FactorType.FULL_DATETIME:
		# noinspection DuplicatedCode
		if isinstance(value, datetime):
			return value
		if isinstance(value, date):
			return datetime(year=value.year, month=value.month, day=value.day)
		if isinstance(value, time):
			raise DataKernelException(
				f'Value[{value}, type={type(value)}] is incompatible with '
				f'factor[name={factor.name}, type={factor_type}].')

		parsed, date_value = is_date(str(value), ask_full_datetime_formats())
		if parsed:
			return date_value
		else:
			raise DataKernelException(
				f'Value[{value}, type={type(value)}] is incompatible with '
				f'factor[name={factor.name}, type={factor_type}].')
	elif factor_type == FactorType.DATETIME:
		# noinspection DuplicatedCode
		if isinstance(value, datetime):
			return value
		if isinstance(value, date):
			return datetime(year=value.year, month=value.month, day=value.day)
		if isinstance(value, time):
			raise DataKernelException(
				f'Value[{value}, type={type(value)}] is incompatible with '
				f'factor[name={factor.name}, type={factor_type}].')

		parsed, date_value = is_date(str(value), ask_all_date_formats())
		if parsed:
			return date_value
		else:
			raise DataKernelException(
				f'Value[{value}, type={type(value)}] is incompatible with '
				f'factor[name={factor.name}, type={factor_type}].')
	elif factor_type in [
		FactorType.DATE, FactorType.DATE_OF_BIRTH
	]:
		if isinstance(value, datetime):
			return value.date()
		if isinstance(value, date):
			return value
		if isinstance(value, time):
			raise DataKernelException(
				f'Value[{value}, type={type(value)}] is incompatible with '
				f'factor[name={factor.name}, type={factor_type}].')

		parsed, date_value = is_date(value, ask_all_date_formats())
		if parsed:
			if isinstance(date_value, datetime):
				return date_value.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
			else:
				return date_value
		else:
			raise DataKernelException(
				f'Value[{value}, type={type(value)}] is incompatible with '
				f'factor[name={factor.name}, type={factor_type}].')
	elif factor_type == FactorType.TIME:
		if isinstance(value, datetime):
			return value.time()
		if isinstance(value, date):
			raise DataKernelException(
				f'Value[{value}, type={type(value)}] is incompatible with '
				f'factor[name={factor.name}, type={factor_type}].')
		if isinstance(value, time):
			return value

		parsed, time_value = is_time(value, ask_time_formats())
		if parsed:
			return time_value
		else:
			raise DataKernelException(
				f'Value[{value}, type={type(value)}] is incompatible with '
				f'factor[name={factor.name}, type={factor_type}].')
	elif factor_type in [
		FactorType.YEAR, FactorType.HALF_YEAR, FactorType.QUARTER,
		FactorType.MONTH, FactorType.HALF_MONTH, FactorType.TEN_DAYS,
		FactorType.WEEK_OF_YEAR, FactorType.WEEK_OF_MONTH, FactorType.HALF_WEEK,
		FactorType.DAY_OF_MONTH, FactorType.DAY_OF_WEEK, FactorType.DAY_KIND,
		FactorType.HOUR, FactorType.HOUR_KIND,
		FactorType.MINUTE, FactorType.SECOND, FactorType.MILLISECOND,
		FactorType.AM_PM
	]:
		# TODO strictly validation is needed or not?
		parsed, decimal_value = is_decimal(value)
		if parsed:
			return decimal_value
		else:
			raise DataKernelException(
				f'Value[{value}] is incompatible with factor[name={factor.name}, type={factor_type}].')
	elif factor_type == FactorType.BOOLEAN:
		if isinstance(value, bool):
			return value
		elif isinstance(value, (int, float, Decimal)):
			return value != 0
		elif isinstance(value, str):
			v = value.strip().lower()
			if v == 't' or v == 'y' or v == 'yes' or v == 'true':
				return True
			elif v == 'f' or v == 'n' or v == 'no' or v == 'false':
				return False
		raise DataKernelException(
			f'Value[{value}, type={type(value)}] is incompatible with '
			f'factor[name={factor.name}, type={factor_type}].')
	else:
		raise DataKernelException(f'Factor type[{factor_type}] is not supported.')
