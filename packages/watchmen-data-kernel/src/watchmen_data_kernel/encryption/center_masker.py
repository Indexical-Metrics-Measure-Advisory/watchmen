from re import findall
from typing import Any, List, Tuple, Union

from math import ceil, floor

from watchmen_data_kernel.common import DataKernelException
from watchmen_model.admin import FactorEncryptMethod
from watchmen_utilities import ArrayHelper
from .encryptor import Encryptor


class CenterMasker(Encryptor):
	def __init__(self, digits: int):
		self.digits = digits
		if digits == 3:
			self.method = FactorEncryptMethod.MASK_CENTER_3
		elif digits == 5:
			self.method = FactorEncryptMethod.MASK_CENTER_5
		else:
			raise DataKernelException(f'Only 3 or 5 digits center mask is supported, current is [{digits}].')

	def accept(self, method: Union[FactorEncryptMethod, str]) -> bool:
		return method == self.method

	def is_encrypted(self, value: Any) -> bool:
		"""
		always returns false
		"""
		return False

	def do_encrypt_as_normal(self, value: str, length: int) -> str:
		digits = self.digits
		remains = length - digits
		if remains % 2 == 1:
			pad_count = floor(remains / 2)
			return f'{value[:pad_count + 1]}{"*" * digits}{value[length - pad_count:]}'
		else:
			pad_count = int(remains / 2)
			return f'{value[:pad_count]}{"*" * digits}{value[length - pad_count:]}'

	# noinspection PyMethodMayBeStatic
	def replace_from_left(self, segment: str, remain_chars_count: int) -> Tuple[int, str]:
		char_count = len(segment)
		if char_count >= remain_chars_count:
			return 0, f'{"*" * remain_chars_count}{segment[remain_chars_count:]}'
		else:
			return remain_chars_count - char_count, '*' * char_count

	# noinspection PyMethodMayBeStatic
	def replace_from_right(self, segment: str, remain_chars_count: int) -> Tuple[int, str]:
		char_count = len(segment)
		if char_count >= remain_chars_count:
			return 0, f'{segment[:0 - remain_chars_count]}{"*" * remain_chars_count}'
		else:
			return remain_chars_count - char_count, '*' * char_count

	def do_encrypt(self, value: Any) -> Any:
		digits = self.digits

		value = str(value)
		length = len(value)
		if length <= digits:
			# mask all
			return '*' * length

		# last part is empty, ignored
		segments = ArrayHelper(findall(r'((\d+|\D*)?)', value)[:-1]).map(lambda x: x[0]).to_list()
		decimal_char_count = ArrayHelper(segments).filter(lambda x: x.isdecimal()) \
			.reduce(lambda count, x: count + len(x), 0)
		if decimal_char_count < digits:
			# no enough decimal characters, mask as normal string
			return self.do_encrypt_as_normal(value, length)

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

		replaced_segments: List[str] = []
		current_index = central_index
		remain_count = digits

		for segment in segments:
			if segment.isdecimal():
				index = index + 1
				if index == current_index:
					remain_count, replaced = self.replace_from_left(segment, remain_count)
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
		else:
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
							remain_count, replaced = self.replace_from_right(segment, remain_count)
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

	def do_decrypt(self, value: str) -> str:
		# center mask cannot be decrypted
		return value

	def get_key_type(self) -> str:
		return self.method.value
