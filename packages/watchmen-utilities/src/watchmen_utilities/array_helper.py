from __future__ import annotations

from typing import Any, Callable, List, Optional

ArrayPredicate = Callable[[Any], bool]
ArrayTransform = Callable[[Any], Any]
ArrayAction = Callable[[Any], None]
ArrayCompare = Callable[[Any, Any], bool]
ArrayReduce = Callable[[Any, Any], Any]


def equals(a: Any, b: Any) -> bool:
	return a == b


class ArrayHelper:
	def __init__(self, a_list: Optional[list]):
		if a_list is None:
			self.a_list = []
		else:
			self.a_list = a_list

	def flatten(self, level: int = 1) -> ArrayHelper:
		new_list: list = []
		for an_element in self.a_list:
			if isinstance(an_element, list):
				for a_sub_element in an_element:
					new_list.append(a_sub_element)
			else:
				new_list.append(an_element)

		level = level - 1
		if level <= 0:
			return ArrayHelper(new_list)
		else:
			return ArrayHelper(new_list).flatten(level)

	def to_list(self):
		return self.a_list

	def to_map(self, as_key: ArrayTransform, as_value: ArrayTransform = lambda x: x) -> dict[Any, Any]:
		a_dict = {}
		for an_element in self.a_list:
			key = as_key(an_element)
			value = as_value(an_element)
			a_dict[key] = value
		return a_dict

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

	def reduce(self, func: ArrayReduce, accumulator: Optional[Any]) -> Any:
		if len(self.a_list) == 0:
			return accumulator

		if accumulator is None:
			accumulator = self.a_list[0]
			rest = self.a_list[1:]
		else:
			rest = self.a_list
		for an_element in rest:
			accumulator = func(accumulator, an_element)
		return accumulator

	# noinspection DuplicatedCode
	def distinct(self, func: Optional[ArrayCompare] = None) -> ArrayHelper:
		"""
		remove elements duplicated which satisfies given compare function
		"""
		if func is None:
			return ArrayHelper(list(set(self.a_list)))

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

	def difference(self, another_list: Optional[list], func: Optional[ArrayCompare] = equals) -> ArrayHelper:
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

	def grab(self, *elements: Any) -> ArrayHelper:
		for an_element in elements:
			self.a_list.append(an_element)
		return self

	def group_by(self, group: ArrayTransform) -> dict[Any, List[Any]]:
		a_dict = {}
		for an_element in self.a_list:
			key = group(an_element)
			existing: list = a_dict.get(key)
			if existing is not None:
				existing.append(an_element)
			else:
				a_dict[key] = [an_element]
		return a_dict
