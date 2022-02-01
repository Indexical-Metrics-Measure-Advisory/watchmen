from __future__ import annotations

from typing import Any, Callable, Optional

ArrayPredicate = Callable[[Any], bool]
ArrayTransform = Callable[[Any], Any]
ArrayAction = Callable[[Any], None]


class ArrayHelper:
	def __init__(self, a_list: list):
		self.a_list = a_list

	def to_list(self):
		return self.a_list

	def each(self, func: ArrayAction) -> None:
		for a_element in self.a_list:
			func(a_element)

	def filter(self, func: ArrayPredicate) -> ArrayHelper:
		new_list: list = []
		for a_element in self.a_list:
			if func(a_element):
				new_list.append(a_element)
		return ArrayHelper(new_list)

	def map(self, func: ArrayTransform) -> ArrayHelper:
		new_list: list = []
		for a_element in self.a_list:
			new_list.append(func(a_element))
		return ArrayHelper(new_list)

	def first(
			self,
			transform_to: ArrayTransform = lambda x: x,
			found: ArrayPredicate = lambda x: x is not None
	) -> Optional[Any]:
		"""
		first one of array which match the found function after transform_to function
		"""
		for a_element in self.a_list:
			new_element = transform_to(a_element)
			if found(new_element):
				return new_element
		return None
