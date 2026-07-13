"""Masking policy and algorithms driven by FactorType / FactorEncryptMethod.

watchmen-metricflow does not depend on watchmen-data-kernel (which owns the
AES/MD5/masking pipeline), so this module provides a pure-function display-time
masking implementation. The algorithms mirror data-kernel's ``mail_masker`` /
``center_masker`` / ``last_masker`` / ``date_masker`` so that ontology query
results are masked in the same shape as the write-side pipeline.

Note: this module only does display-time (irreversible) masking, not reversible
encryption. When ``AES256_PKCS5_PADDING`` / ``MD5`` / ``SHA256`` is configured,
it means the write side (data-kernel) already persisted the value as
ciphertext/hash; ontology reads raw SQL and gets the ciphertext back, so we pass
it through unchanged without further processing.
"""

from datetime import date, datetime
from math import ceil, floor
from re import findall
from typing import Any, Dict, Optional, Set

from watchmen_model.admin import FactorEncryptMethod, FactorType
from watchmen_utilities import ArrayHelper, is_date_plus_format


# FactorTypes considered sensitive and requiring masking.
# Aligned with the types that the frontend ``CompatibleEncryptMethods``
# (factor-types.ts:202-291) allows encryption methods for:
# EMAIL / PHONE / MOBILE / FAX / ID_NO / DATE_OF_BIRTH.
# Other types (NUMBER / TEXT / DATE / ...) are not masked by default.
SENSITIVE_FACTOR_TYPES: Set[FactorType] = {
	FactorType.EMAIL,
	FactorType.PHONE,
	FactorType.MOBILE,
	FactorType.FAX,
	FactorType.ID_NO,
	FactorType.DATE_OF_BIRTH,
}

# Default masking method per type (used when encrypt is not configured).
# Matches the first choice in the frontend CompatibleEncryptMethods.
DEFAULT_MASK_FOR_TYPE: Dict[FactorType, FactorEncryptMethod] = {
	FactorType.EMAIL: FactorEncryptMethod.MASK_MAIL,
	FactorType.PHONE: FactorEncryptMethod.MASK_CENTER_5,
	FactorType.MOBILE: FactorEncryptMethod.MASK_CENTER_5,
	FactorType.FAX: FactorEncryptMethod.MASK_CENTER_5,
	FactorType.ID_NO: FactorEncryptMethod.MASK_LAST_6,
	FactorType.DATE_OF_BIRTH: FactorEncryptMethod.MASK_MONTH_DAY,
}

# Accepted date parsing formats for date masking, consistent with the
# data-kernel date_masker default scenarios.
_DATE_MASK_FORMATS = [
	'%Y-%m-%d', '%Y/%m/%d',
	'%Y-%m-%d %H:%M:%S', '%Y/%m/%d %H:%M:%S',
	'%Y%m%d',
]


def is_sensitive_type(factor_type: Optional[FactorType]) -> bool:
	"""Whether the FactorType is sensitive (requires masking)."""
	return factor_type is not None and factor_type in SENSITIVE_FACTOR_TYPES


def default_method_for_type(factor_type: Optional[FactorType]) -> Optional[FactorEncryptMethod]:
	"""Default masking method for a type; returns None for non-sensitive types."""
	if factor_type is None:
		return None
	return DEFAULT_MASK_FOR_TYPE.get(factor_type)


def mask_value(value: Any, method: Optional[FactorEncryptMethod]) -> Any:
	"""Mask a single value for display according to ``FactorEncryptMethod``.

	- ``None`` / empty string are returned unchanged.
	- AES / MD5 / SHA256 / NONE: pass through (write side already handled it,
	  or explicitly no masking).
	- Other methods: mask per algorithm; on internal error fall back to the
	  generic ``first+stars+last`` mask to avoid breaking the query.
	"""
	if value is None:
		return None
	# check empty string before str() to avoid masking 0 / False
	if isinstance(value, str) and value == '':
		return ''
	if method is None or method == FactorEncryptMethod.NONE:
		return value
	# AES / hash: write side already persisted as ciphertext/hash; no display-side processing
	if method in (
		FactorEncryptMethod.AES256_PKCS5_PADDING,
		FactorEncryptMethod.MD5,
		FactorEncryptMethod.SHA256,
	):
		return value
	try:
		if method == FactorEncryptMethod.MASK_MAIL:
			return _mask_mail(value)
		if method == FactorEncryptMethod.MASK_CENTER_3:
			return _mask_center(value, 3)
		if method == FactorEncryptMethod.MASK_CENTER_5:
			return _mask_center(value, 5)
		if method == FactorEncryptMethod.MASK_LAST_3:
			return _mask_last(value, 3)
		if method == FactorEncryptMethod.MASK_LAST_6:
			return _mask_last(value, 6)
		if method == FactorEncryptMethod.MASK_DAY:
			return _mask_date(value, mask_month=False, mask_day=True)
		if method == FactorEncryptMethod.MASK_MONTH:
			return _mask_date(value, mask_month=True, mask_day=False)
		if method == FactorEncryptMethod.MASK_MONTH_DAY:
			return _mask_date(value, mask_month=True, mask_day=True)
	except Exception:  # noqa: BLE001 - display-time masking must not break the query
		return _mask_generic(value)
	return value


# =============================================================================
# Pure-function implementations matching each data-kernel masker algorithm
# =============================================================================

def _mask_mail(value: Any) -> str:
	"""Mirrors mail_masker.MailMasker.do_encrypt: keep @ and domain, replace local part with *****."""
	text = str(value)
	pos = text.find('@')
	if pos > 0:
		return f'*****{text[pos:]}'
	return text


def _mask_center(value: Any, digits: int) -> str:
	"""Mirrors center_masker.CenterMasker.do_encrypt: mask ``digits`` of the central numeric segment."""
	text = str(value)
	length = len(text)
	if length <= digits:
		return '*' * length
	# last part is empty, ignored
	segments = ArrayHelper(findall(r'((\d+|\D*)?)', text)[:-1]).map(lambda x: x[0]).to_list()
	decimal_char_count = ArrayHelper(segments).filter(lambda x: x.isdecimal()) \
		.reduce(lambda count, x: count + len(x), 0)
	if decimal_char_count < digits:
		# no enough decimal characters, mask as normal string
		return _mask_center_as_normal(text, length, digits)

	decimal_count = len([segment for segment in segments if segment.isdecimal()])
	if decimal_count == 1:
		# only one part
		replaced_segments = []
		for segment in segments:
			if segment.isdecimal():
				replaced_segments.append(f'{"*" * digits}{segment[digits:]}')
			else:
				replaced_segments.append(segment)
		return ''.join(replaced_segments)

	# at least 2 decimal parts
	central_index = ceil((decimal_count + 1) / 2)
	index = 0

	replaced_segments = []
	current_index = central_index
	remain_count = digits

	for segment in segments:
		if segment.isdecimal():
			index = index + 1
			if index == current_index:
				remain_count, replaced = _replace_from_left(segment, remain_count)
				replaced_segments.append(replaced)
				if remain_count != 0:
					# try to replace next decimal segment
					current_index = current_index + 1
			else:
				replaced_segments.append(segment)
		else:
			replaced_segments.append(segment)

	if remain_count == 0:
		return ''.join(replaced_segments)

	# still not enough characters, try to look backward
	current_index = central_index - 1
	while current_index > 0:
		segments = replaced_segments
		replaced_segments = []
		index = 0
		for segment in segments:
			if segment.isdecimal():
				index = index + 1
				if index == current_index:
					remain_count, replaced = _replace_from_right(segment, remain_count)
					replaced_segments.append(replaced)
					if remain_count != 0:
						# look backward again
						current_index = current_index - 1
					else:
						# break
						current_index = 0
				else:
					replaced_segments.append(segment)
			else:
				replaced_segments.append(segment)
	return ''.join(replaced_segments)


def _mask_center_as_normal(value: str, length: int, digits: int) -> str:
	remains = length - digits
	if remains % 2 == 1:
		pad_count = floor(remains / 2)
		return f'{value[:pad_count + 1]}{"*" * digits}{value[length - pad_count:]}'
	pad_count = int(remains / 2)
	return f'{value[:pad_count]}{"*" * digits}{value[length - pad_count:]}'


def _replace_from_left(segment: str, remain_chars_count: int):
	char_count = len(segment)
	if char_count >= remain_chars_count:
		return 0, f'{"*" * remain_chars_count}{segment[remain_chars_count:]}'
	return remain_chars_count - char_count, '*' * char_count


def _replace_from_right(segment: str, remain_chars_count: int):
	char_count = len(segment)
	if char_count >= remain_chars_count:
		return 0, f'{segment[:0 - remain_chars_count]}{"*" * remain_chars_count}'
	return remain_chars_count - char_count, '*' * char_count


def _mask_last(value: Any, digits: int) -> str:
	"""Mirrors last_masker.LastMasker.do_encrypt: mask the last ``digits`` numeric characters."""
	text = str(value)
	length = len(text)
	if length <= digits:
		return '*' * length
	decimal_count = len([ch for ch in text if ch.isdecimal()])
	if decimal_count < digits:
		# not enough numeric characters; mask the last n characters regardless of type
		return f'{text[0:length - digits]}{"*" * digits}'
	# mask the last n numeric characters
	reversed_value = text[::-1]
	replaced_value = []
	masked_count = 0
	for ch in reversed_value:
		if masked_count < digits and ch.isdecimal():
			masked_count = masked_count + 1
			replaced_value.append('*')
		else:
			replaced_value.append(ch)
	return ''.join(replaced_value)[::-1]


def _mask_date(value: Any, mask_month: bool, mask_day: bool) -> Any:
	"""Mirrors date_masker.DateMasker.do_encrypt: reset month/day to 1 in the date."""
	if isinstance(value, date) and not isinstance(value, datetime):
		if mask_month and mask_day:
			return value.replace(month=1, day=1)
		if mask_month:
			return value.replace(month=1)
		if mask_day:
			return value.replace(day=1)
		return value
	if isinstance(value, datetime):
		# datetime is a subclass of date; mask per date rules, keep the time
		if mask_month and mask_day:
			return value.replace(month=1, day=1)
		if mask_month:
			return value.replace(month=1)
		if mask_day:
			return value.replace(day=1)
		return value

	if not isinstance(value, str):
		# not a string/date; fall back to generic mask
		return _mask_generic(value)

	parsed, date_value, date_format = is_date_plus_format(value, _DATE_MASK_FORMATS)
	if not parsed:
		# cannot parse as date; fall back to generic mask to avoid breaking the query
		return _mask_generic(value)
	# mask the date value first, then format back to string
	if mask_month and mask_day:
		masked_date = date_value.replace(month=1, day=1)
	elif mask_month:
		masked_date = date_value.replace(month=1)
	elif mask_day:
		masked_date = date_value.replace(day=1)
	else:
		masked_date = date_value
	formatted_value = masked_date.strftime(date_format)
	if len(formatted_value) == len(value):
		return formatted_value
	# gather decimal characters from formatted, other characters from original
	final_value = []
	formatted_value_index = 0
	for ch in value:
		if not ch.isdecimal():
			final_value.append(ch)
		else:
			final_value.append(formatted_value[formatted_value_index])
			formatted_value_index = formatted_value_index + 1
	return ''.join(final_value)


def _mask_generic(value: Any) -> Any:
	"""Generic fallback mask: keep first and last, replace the middle with ``*``.
	Consistent with the original security_layer behavior."""
	if value is None:
		return None
	text = str(value)
	if len(text) <= 1:
		return '*'
	if len(text) == 2:
		return text[0] + '*'
	return text[0] + ('*' * (len(text) - 2)) + text[-1]
