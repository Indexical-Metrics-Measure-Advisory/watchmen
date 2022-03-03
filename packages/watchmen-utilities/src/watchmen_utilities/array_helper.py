from __future__ import annotations

from typing import Any, Callable, List, Optional, Tuple

ArrayPredicate = Callable[[Any], bool]
ArrayFind = Callable[[Any], Tuple[bool, Any]]
ArrayTransform = Callable[[Any], Any]
ArrayWithIndexTransform = Callable[[Any, int], Any]
ArrayAction = Callable[[Any], None]
ArrayWithIndexAction = Callable[[Any, int], None]
ArrayCompare = Callable[[Any, Any], bool]
ArrayReduce = Callable[[Any, Any], Any]


def equals(a: Any, b: Any) -> bool:
	return a == b


class ArrayHelper:
	def __init__(self, a_list: Optional[list]):
		if a_list is None:
			self.aList = []
		else:
			self.aList = a_list

	def flatten(self, level: int = 1) -> ArrayHelper:
		new_list: list = []
		for an_element in self.aList:
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
		return self.aList

	def to_map(self, as_key: ArrayTransform, as_value: ArrayTransform = lambda x: x) -> dict[Any, Any]:
		a_dict = {}
		for an_element in self.aList:
			key = as_key(an_element)
			value = as_value(an_element)
			a_dict[key] = value
		return a_dict

	def copy(self) -> ArrayHelper:
		return ArrayHelper(list(self.aList))

	def each(self, func: ArrayAction) -> ArrayHelper:
		"""
		apply given function to each element, and return myself
		"""
		for an_element in self.aList:
			func(an_element)
		return self

	def each_with_index(self, func: ArrayWithIndexAction) -> ArrayHelper:
		"""
		apply given function to each element, and return myself
		"""
		for index, an_element in enumerate(self.aList):
			func(an_element, index)
		return self

	def find(self, func: ArrayPredicate) -> Optional[Any]:
		"""
		find element which satisfies the given predicate function, returns None when not found
		"""
		for an_element in self.aList:
			if func(an_element):
				return an_element
		return None

	def filter(self, func: ArrayPredicate) -> ArrayHelper:
		"""
		pick elements which satisfies the given predicate function
		"""
		new_list: list = []
		for an_element in self.aList:
			if func(an_element):
				new_list.append(an_element)
		return ArrayHelper(new_list)

	def some(self, func: ArrayPredicate) -> bool:
		"""
		return true when at least one element satisfies the given predicate function
		"""
		for an_element in self.aList:
			if func(an_element):
				return True
		return False

	def every(self, func: ArrayPredicate) -> bool:
		"""
		return true when every element satisfies the given predicate function
		"""
		for an_element in self.aList:
			if not func(an_element):
				return False
		return True

	def map(self, func: ArrayTransform) -> ArrayHelper:
		"""
		transform each element by given transform function
		"""
		new_list: list = []
		for an_element in self.aList:
			new_list.append(func(an_element))
		return ArrayHelper(new_list)

	def map_with_index(self, func: ArrayWithIndexTransform) -> ArrayHelper:
		"""
		transform each element by given transform function
		"""
		new_list: list = []
		for index, an_element in enumerate(self.aList):
			new_list.append(func(an_element, index))
		return ArrayHelper(new_list)

	def reduce(self, func: ArrayReduce, accumulator: Optional[Any]) -> Any:
		if len(self.aList) == 0:
			return accumulator

		if accumulator is None:
			accumulator = self.aList[0]
			rest = self.aList[1:]
		else:
			rest = self.aList
		for an_element in rest:
			accumulator = func(accumulator, an_element)
		return accumulator

	# noinspection DuplicatedCode
	def distinct(self, func: Optional[ArrayCompare] = None) -> ArrayHelper:
		"""
		remove elements duplicated which satisfies given compare function
		"""
		if func is None:
			return ArrayHelper(list(set(self.aList)))

		new_list: list = []
		for an_element in self.aList:
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
		for an_element in self.aList:
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
			find: ArrayFind = lambda x: (True, x) if x is not None else (False, None)
	) -> Optional[Any]:
		"""
		first one of array which match the found function after transform_to function
		"""
		for an_element in self.aList:
			found, value = find(an_element)
			if found:
				return value
		return None

	def grab(self, *elements: Any) -> ArrayHelper:
		for an_element in elements:
			self.aList.append(an_element)
		return self

	def group_by(self, group: ArrayTransform) -> dict[Any, List[Any]]:
		a_dict = {}
		for an_element in self.aList:
			key = group(an_element)
			existing: list = a_dict.get(key)
			if existing is not None:
				existing.append(an_element)
			else:
				a_dict[key] = [an_element]
		return a_dict

	def join(self, separator: str) -> str:
		new_list: list = []
		for an_element in self.aList:
			if an_element is not None:
				new_list.append(str(an_element))
		return separator.join(new_list)

	def size(self) -> int:
		return len(self.aList)
