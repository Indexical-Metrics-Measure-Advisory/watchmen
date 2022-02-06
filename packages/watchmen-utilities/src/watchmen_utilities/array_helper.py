from __future__ import annotations

from typing import Any, Callable, Optional

ArrayPredicate = Callable[[Any], bool]
ArrayTransform = Callable[[Any], Any]
ArrayAction = Callable[[Any], None]
ArrayCompare = Callable[[Any, Any], bool]


def equals(a: Any, b: Any) -> bool:
	return a == b


class ArrayHelper:
	def __init__(self, a_list: Optional[list]):
		if a_list is None:
			self.a_list = []
		else:
			self.a_list = a_list

	def to_list(self):
		return self.a_list

	def each(self, func: ArrayAction) -> ArrayHelper:
		"""
		apply given function to each element, and return myself
		"""
		for an_element in self.a_list:
			func(an_element)
		return self

	def filter(self, func: ArrayPredicate) -> ArrayHelper:
		"""
		pick elements which satisfies the given predicate function
		"""
		new_list: list = []
		for an_element in self.a_list:
			if func(an_element):
				new_list.append(an_element)
		return ArrayHelper(new_list)

	def some(self, func: ArrayPredicate) -> bool:
		"""
		return true when at least one element satisfies the given predicate function
		"""
		for an_element in self.a_list:
			if func(an_element):
				return True
		return False

	def every(self, func: ArrayPredicate) -> bool:
		"""
		return true when every element satisfies the given predicate function
		"""
		for an_element in self.a_list:
			if not func(an_element):
				return False
		return True

	def map(self, func: ArrayTransform) -> ArrayHelper:
		"""
		transform each element by given transform function
		"""
		new_list: list = []
		for an_element in self.a_list:
			new_list.append(func(an_element))
		return ArrayHelper(new_list)

	def distinct(self, func: ArrayCompare = equals) -> ArrayHelper:
		"""
		remove elements duplicated which satisfies given compare function
		"""
		# noinspection DuplicatedCode
		new_list: list = []
		for an_element in self.a_list:
			found: bool = False
			for an_existing_element in new_list:
				if func(an_element, an_existing_element):
					found = True
					break
			if not found:
				new_list.append(an_element)
		return ArrayHelper(new_list)

	def difference(self, another_list: Optional[list], func: ArrayCompare = equals) -> ArrayHelper:
		"""
		pick elements which included in self but not in another
		"""
		if another_list is None or len(another_list) == 0:
			return self

		# noinspection DuplicatedCode
		new_list: list = []
		for an_element in self.a_list:
			found: bool = False
			for an_another_element in another_list:
				if func(an_element, an_another_element):
					found = True
					break
			if not found:
				new_list.append(an_element)
		return ArrayHelper(new_list)

	def first(
			self,
			transform_to: ArrayTransform = lambda x: x,
			found: ArrayPredicate = lambda x: x is not None
	) -> Optional[Any]:
		"""
		first one of array which match the found function after transform_to function
		"""
		for an_element in self.a_list:
			new_element = transform_to(an_element)
			if found(new_element):
				return new_element
		return None
