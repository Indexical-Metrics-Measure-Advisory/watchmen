from __future__ import print_function

from collections import deque

from itertools import chain
from sys import getsizeof, stderr

try:
	from reprlib import repr
except ImportError:
	pass


def total_size(o, handlers={}, verbose=False):
	""" Returns the approximate memory footprint an object and all of its contents.

	Automatically finds the contents of the following builtin containers and
	their subclasses:  tuple, list, deque, dict, set and frozenset.
	To search other containers, add handlers to iterate over their contents:

		handlers = {SomeContainerClass: iter,
					OtherContainerClass: OtherContainerClass.get_elements}

	"""
	dict_handler = lambda d: chain.from_iterable(d.items())
	all_handlers = {tuple: iter,
	                list: iter,
	                deque: iter,
	                dict: dict_handler,
	                set: iter,
	                frozenset: iter,
	                }
	all_handlers.update(handlers)  # user handlers take precedence
	seen = set()  # track which object id's have already been seen
	default_size = getsizeof(0)  # estimate sizeof object without __sizeof__

	def sizeof(o):
		if id(o) in seen:  # do not double count the same object
			return 0
		seen.add(id(o))
		s = getsizeof(o, default_size)

		if verbose:
			print(s, type(o), repr(o), file=stderr)

		for typ, handler in all_handlers.items():
			if isinstance(o, typ):
				s += sum(map(sizeof, handler(o)))
				break
		return s

	return sizeof(o)
