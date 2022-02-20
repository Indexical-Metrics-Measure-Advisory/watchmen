from typing import Any, Dict
from unittest import TestCase

from watchmen_reactor.pipeline.runtime import get_value_from, PipelineVariables


def value(variables: Dict[str, Any], name: str) -> Any:
	pv = PipelineVariables(None, variables)
	return get_value_from(name, name.strip().split('.'), lambda x: pv.find_from_current_data(x))


class GetValueFromDict(TestCase):
	# noinspection PyMethodMayBeStatic
	def test_get(self):
		a_dict = {
			'a': 'a',
			'b': {
				'c': 'c',
				'd': {
					'e': 'e'
				}
			},
			'f': [
				{'g': 'g1', 'h': [{'i': 'i1'}, {'i': 'i2'}]},
				{'g': 'g2', 'h': [{'i': 'i3'}, {'i': 'i4'}]}
			]
		}
		a = value(a_dict, 'a')
		self.assertEqual(a, 'a', f'Expect "a" on "a", but "{a}"')
		bc = value(a_dict, 'b.c')
		self.assertEqual(bc, 'c', f'Expect "c" on "b.c", but "{bc}"')
		bd = value(a_dict, 'b.d')
		bd_expect = {'e': 'e'}
		self.assertEqual(bd, bd_expect, f'Expect "{bd_expect}" on "b.d", but "{bd}"')
		bde = value(a_dict, 'b.d.e')
		self.assertEqual(bde, 'e', f'Expect "e" on "b.c.d", but "{bde}"')
		f = value(a_dict, 'f')
		f_expect = [{'g': 'g1', 'h': [{'i': 'i1'}, {'i': 'i2'}]}, {'g': 'g2', 'h': [{'i': 'i3'}, {'i': 'i4'}]}]
		self.assertEqual(f, f_expect, f'Expect "{f_expect}" on "f", but "{f}"')
		fg = value(a_dict, 'f.g')
		fg_expect = ['g1', 'g2']
		self.assertEqual(fg, fg_expect, f'Expect "{fg_expect}" on "f.g", but "{fg}"')
		fh = value(a_dict, 'f.h')
		fh_expect = [{'i': 'i1'}, {'i': 'i2'}, {'i': 'i3'}, {'i': 'i4'}]
		self.assertEqual(fh, fh_expect, f'Expect "{fh_expect}" on "f.h", but "{fh}"')
		fhi = value(a_dict, 'f.h.i')
		fhi_expect = ['i1', 'i2', 'i3', 'i4']
		self.assertEqual(fhi, fhi_expect, f'Expect "{fhi_expect}" on "f.h.i", but "{fhi}"')
