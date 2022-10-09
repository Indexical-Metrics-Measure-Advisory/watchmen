from re import findall
from typing import List, Tuple

from watchmen_data_kernel.common import DataKernelException
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank


class MightAVariable:
	def __init__(self, text: str, variable: str):
		self.text = text
		self.variable = variable

	def has_text(self):
		return is_not_blank(self.text)

	def has_variable(self):
		return is_not_blank(self.variable)


def parse_variable(variable_str: str) -> Tuple[bool, List[MightAVariable]]:
	# parsed result is:
	# for empty string, a list contains one tuple: [('', '')]
	# for no variable string, a list contains 2 tuples: [(value, ''), ('', '')]
	# found, a list contains x tuples: [(first, first_variable), (second, second_variable), ..., ('', '')]
	parsed = findall('([^{]*({[^}]+})?)', variable_str)
	if parsed[0][0] == '':
		# no variable required
		return False, [MightAVariable(text=variable_str, variable='')]
	else:
		def beautify(a_tuple: Tuple[str, str]) -> MightAVariable:
			if a_tuple[1] == '':
				# no variable in it
				return MightAVariable(text=a_tuple[0], variable='')
			else:
				# remove variable from first, remove braces from second
				return MightAVariable(text=a_tuple[0][: (0 - len(a_tuple[1]))], variable=a_tuple[1][1:-1].strip())

		return True, ArrayHelper(parsed[:-1]).map(lambda x: beautify(x)).to_list()


def parse_function_in_variable(function_literal: str, function_name: str, parameters_count: int):
	if parameters_count < 1:
		raise DataKernelException('At least one parameter for function in variable.')

	one_param = ['(.+)']
	all_params = ','.join([param for param in one_param for _ in range(parameters_count)])
	parsed_params = findall(f'^({function_name})\\s*\\({all_params}\\)$', function_literal)
	if len(parsed_params) != 1:
		raise DataKernelException(f'Constant[{function_literal}] is not supported.')
	if len(parsed_params[0]) != parameters_count + 1:
		raise DataKernelException(f'Constant[{function_literal}] is not supported.')
	variable_names = parsed_params[0][1:]
	for variable_name in variable_names:
		if is_blank(variable_name):
			raise DataKernelException(f'Constant[{function_literal}] is not supported.')
	return variable_names


# noinspection DuplicatedCode
def parse_move_date_pattern(pattern: str) -> List[Tuple[str, str, str]]:
	"""
	elements of tuple are
	1. flag: YMDhms
	2. operator: +- or empty
	3. number
	"""
	pattern = pattern.strip()
	segments = findall(r'([YMDhms])\s*([+-]?)\s*(\d+)', pattern)
	parsed = ArrayHelper(segments).map(lambda x: f'{x[0]}{x[1]}{x[2]}').join('')
	original = ArrayHelper([*pattern]).filter(lambda x: is_not_blank(x)).join('')
	if parsed != original:
		raise DataKernelException(f'Incorrect date move pattern[{pattern}].')
	return segments
