from __future__ import annotations

from typing import Any, Callable

ArrayPredicate = Callable[[Any], bool]
ArrayMap = Callable[[Any], Any]


class ArrayHelper:
	def __init__(self, a_list: list):
		self.a_list = a_list

	def to_list(self):
		return self.a_list

	def filter(self, func: ArrayPredicate) -> ArrayHelper:
		new_list: list = []
		for a_element in self.a_list:
			if func(a_element):
				new_list.append(a_element)
		return ArrayHelper(new_list)

	def map(self, func: ArrayMap) -> ArrayHelper:
		new_list: list = []
		for a_element in self.a_list:
			new_list.append(func(a_element))
		return ArrayHelper(new_list)
