import functools


class ArrayUtils(object):
	def __init__(self, data_list):
		self.data = data_list

	def map(self, lambda_):
		self.data = list(map(lambda_, self.data))
		return self

	def filter(self, lambda_):
		self.data = list(filter(lambda_, self.data))
		return self

	def to_list(self):
		return self.data

	def reduce(self, lambda_, initial_):
		return functools.reduce(lambda_, self.data, initial_)
