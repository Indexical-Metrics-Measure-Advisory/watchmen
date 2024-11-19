from __future__ import annotations

from functools import reduce
from typing import Any, Callable, List, Optional, Tuple, Dict

ArrayPredicate = Callable[[Any], bool]
ArrayFind = Callable[[Any], Tuple[bool, Any]]
ArrayTransform = Callable[[Any], Any]
ArrayWithIndexTransform = Callable[[Any, int], Any]
ArrayAction = Callable[[Any], None]
ArrayWithIndexAction = Callable[[Any, int], None]
ArrayCompare = Callable[[Any, Any], bool]
ArrayReduce = Callable[[Any, Any], Any]
ArraySort = Callable[[Any, Any], int]


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

    def flatten_(self, level: int = 1) -> ArrayHelper:
        """Flattens a nested list up to the specified level.

        Args:
            level (int, optional): The maximum depth of nesting to flatten. Defaults to 1.

        Returns:
            ArrayHelper: The flattened ArrayHelper instance.
        """

        if level <= 0 or not self.aList:
            return self

        flat_list = []
        for item in self.aList:
            if isinstance(item, list) and level > 1:
                flat_list.extend(ArrayHelper(item).flatten_(level - 1))
            else:
                flat_list.append(item)
        return ArrayHelper(flat_list)

    def to_list(self):
        return self.aList

    def to_map_(self, as_key: ArrayTransform, as_value: ArrayTransform = lambda x: x) -> Dict[Any, Any]:
        a_dict = {}
        for an_element in self.aList:
            key = as_key(an_element)
            value = as_value(an_element)
            a_dict[key] = value
        return a_dict

    def to_map(self, as_key: ArrayTransform, as_value: ArrayTransform = lambda x: x) -> Dict[Any, Any]:
        """Converts the list to a dictionary using provided transform functions.

        Args:
            as_key (Callable[[Any], Any]): Function to transform elements into dictionary keys.
            as_value (Callable[[Any], Any], optional): Function to transform elements into dictionary values. Defaults to identity function (x -> x).

        Returns:
            Dict[Any, Any]: The resulting dictionary.
        """

        return {as_key(element): as_value(element) for element in self.aList}

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

    def filter_(self, func: ArrayPredicate) -> ArrayHelper:
        """
        Filters elements from the list that satisfy the given predicate function and returns a new ArrayHelper object.

        Args:
            func: A callable that takes an element from the list and returns True
                  if the element satisfies the condition, False otherwise.

        Returns:
            A new ArrayHelper object containing the elements that met the predicate.

        Raises:
            TypeError: If the provided argument is not a callable.
        """

        filtered_list = [element for element in self.aList if func(element)]
        return ArrayHelper(filtered_list)

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

    def map_(self, func: ArrayTransform) -> ArrayHelper:
        """
        Applies the given function to each element in the list and returns a new ArrayHelper object containing the transformed elements.

        Args:
            func: A callable that takes an element from the list and returns its transformed value.

        Returns:
            A new ArrayHelper object containing the transformed elements.

        Raises:
            TypeError: If the provided argument is not a callable.
        """

        transformed_list = [func(element) for element in self.aList]
        return ArrayHelper(transformed_list)

    def map_with_index(self, func: ArrayWithIndexTransform) -> ArrayHelper:
        """
        transform each element by given transform function
        """
        new_list: list = []
        for index, an_element in enumerate(self.aList):
            new_list.append(func(an_element, index))
        return ArrayHelper(new_list)

    def map_with_index_(self, func: ArrayWithIndexTransform) -> ArrayHelper:
        """
        Applies the given function to each element and its corresponding index in the list,
        and returns a new ArrayHelper object containing the transformed elements.

        Args:
            func: A callable that takes two arguments:
                  - element (Any): The element from the list.
                  - index (int): The zero-based index of the element.

        Returns:
            A new ArrayHelper object containing the transformed elements.

        Raises:
            TypeError: If the provided argument is not a callable.
        """

        transformed_list = [func(element, index) for element, index in enumerate(self.aList)]
        return ArrayHelper(transformed_list)

    def reduce(self, func: ArrayReduce, accumulator: Optional[Any] = None) -> Any:
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

    def reduce_(self, func: ArrayReduce, accumulator: Optional[Any] = None) -> Any:
        """
        reduce elements by given reduce function
        """
        if accumulator is None:
            return reduce(func, self.aList)
        else:
            return reduce(func, self.aList, accumulator)

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

    def distinct_(self, func: Optional[ArrayCompare] = None) -> ArrayHelper:
        """
        Removes duplicate elements from the list based on an optional comparison function.

        Args:
            func (Optional[Callable[[Any, Any], bool]]): An optional callable that
                takes two elements from the list and returns True if they are considered
                duplicates, False otherwise. If None (default), elements are compared
                using basic equality (==).

        Returns:
            A new ArrayHelper object containing the unique elements from the list.
        """

        if func is None:
            # Use set for efficient removal of duplicates based on equality
            return ArrayHelper(list(set(self.aList)))

        # Use a set for efficient lookup and avoid double nested loops
        seen = set()
        unique_list = []
        for element in self.aList:
            if element not in seen:
                seen.add(element)
                unique_list.append(element)
        return ArrayHelper(unique_list)

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

    def group_by_(self, group: ArrayTransform) -> dict[Any, List[Any]]:
        """
        Groups elements from the list based on the given transformation function.

        Args:
            group (Callable[[Any], Any]): A callable that takes an element from the list and
                returns the key to group that element by.

        Returns:
            A dictionary where keys are the group keys (returned by the 'group' function)
            and values are lists containing elements that belong to that group.
        """

        grouped_dict = {}
        for element in self.aList:
            key = group(element)
            grouped_dict.setdefault(key, []).append(element)

        return grouped_dict

    def join(self, separator: str) -> str:
        new_list: list = []
        for an_element in self.aList:
            if an_element is not None:
                new_list.append(str(an_element))
        return separator.join(new_list)

    def join_(self, separator: str) -> str:
        """
        Joins all elements in the list into a single string using the provided separator.

        Args:
            separator (str): The string to insert between elements during joining.

        Returns:
            A string containing all elements from the list joined with the separator.
        """

        # Handle potential None values gracefully
        not_none_elements = [str(element) for element in self.aList if element is not None]
        return separator.join(not_none_elements)

    def size(self) -> int:
        return len(self.aList)

    # noinspection PyMethodMayBeStatic
    def __quick_sort_partition(self, a_list: List[Any], start_pos: int, end_pos: int, func: ArraySort) -> int:
        the_one = a_list[start_pos]

        i = start_pos
        j = end_pos

        while i < j:
            while func(a_list[j], the_one) >= 0 and i < j:
                j = j - 1

            while func(a_list[i], the_one) <= 0 and i < j:
                i = i + 1

            a_list[i], a_list[j] = a_list[j], a_list[i]

        a_list[i], a_list[start_pos] = a_list[start_pos], a_list[i]

        return i

    def __quick_sort(self, a_list: List[Any], start_pos: int, end_pos: int, func: ArraySort):
        if start_pos < end_pos:
            index = self.__quick_sort_partition(a_list, start_pos, end_pos, func)

            self.__quick_sort(a_list, start_pos, index - 1, func)
            self.__quick_sort(a_list, index + 1, end_pos, func)

    def sort(self, func: ArraySort) -> ArrayHelper:
        self.__quick_sort(self.aList, 0, len(self.aList) - 1, func)
        return self
